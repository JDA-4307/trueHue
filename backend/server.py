import tensorflow as tf
from tensorflow.lite.python.interpreter import Interpreter
import logging
import sys
import json
import base64
from tensorflow.keras.preprocessing.image import img_to_array
from PIL import Image
import io
import numpy as np
from flask import Flask, request, jsonify
from skimage import color
from flask_cors import CORS
import cv2
import os
import uuid
import tempfile
import pandas as pd
from scipy.spatial.distance import euclidean
from tqdm import tqdm

app = Flask(__name__)
# Enable CORS with explicit settings
CORS(app, resources={r"/*": {
    "origins": "*", 
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= RGB CLASSIFIER CONFIGURATION =============
# Base dataset path

import os

# Get the absolute path to the directory where the script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Base dataset path (using absolute path)
BASE_DATASET_PATH = os.path.join(SCRIPT_DIR, "images-dataset-4.0")

# Mapping of colors to their respective dataset paths and reference profiles
COLOR_CONFIG = {
    "medium-cherry": {
        "dataset_path": os.path.join(BASE_DATASET_PATH, "medium-cherry"),
        "reference_csv": os.path.join(SCRIPT_DIR, "category_distances_normalized_medium_cherry.csv")
    },
    "desert-oak": {
        "dataset_path": os.path.join(BASE_DATASET_PATH, "desert-oak"),
        "reference_csv": os.path.join(SCRIPT_DIR, "category_distances_normalized_desert_oak.csv")
    },
    "graphite-walnut": {
        "dataset_path": os.path.join(BASE_DATASET_PATH, "graphite-walnut"),
        "reference_csv": os.path.join(SCRIPT_DIR, "category_distances_normalized_graphite_walnut.csv")
    }
}

# Add this debug code right after the imports
print(f"Script directory: {SCRIPT_DIR}")
print(f"Base dataset path: {BASE_DATASET_PATH}")
for color, config in COLOR_CONFIG.items():
    print(f"{color} dataset path: {config['dataset_path']}")
    print(f"{color} reference CSV: {config['reference_csv']}")
    print(f"  Dataset path exists: {os.path.exists(config['dataset_path'])}")
    print(f"  Reference CSV exists: {os.path.exists(config['reference_csv'])}")

# Categories in order (must match the CSV columns)
CATEGORIES = [
    "out-of-range-too-light",
    "in-range-light",
    "in-range-standard", 
    "in-range-dark",
    "out-of-range-too-dark"
]

VALID_COLORS = list(COLOR_CONFIG.keys())
# =========================================================

# ============= TENSORFLOW MODEL CONFIGURATION =============
# Path to TFLite models
MODELS = {
    'default': './assets/models/wood_classification.tflite',
    'binary_model_graphite_walnut': './assets/models/binary_model_graphite_walnut.tflite',
    'binary_model_medium_cherry': './assets/models/binary_model_medium_cherry.tflite',
    'multiclass_model_graphite_walnut': './assets/models/multiclass_model_graphite_walnut.tflite',
    'regression_model_graphite_walnut': './assets/models/regression_model_graphite_walnut.tflite',
    
    'validation_model_medium_cherry': './assets/models/medium-cherry_classifier_model_lab.tflite',
    'validation_model_desert_oak':'./assets/models/desert-oak_classifier_model_lab.tflite',
    'validation_model_graphite_walnut': './assets/models/graphite-walnut_classifier_model_lab.tflite'
}

# Define class names for each model
CLASS_NAMES = {
    'default': ['desert_oak', 'graphite_walnut', 'medium_cherry'],
    'binary_model_graphite_walnut': ['Out of Range', 'In Range'],
    'binary_model_medium_cherry': ['Out of Range', 'In Range'],
    'multiclass_model_graphite_walnut': ['mediumCherry', 'desertOak', 'graphiteWalnut', 'other'],
    # No classes for regression model
    # For validation models - assume binary [Not Valid, Valid]
    'validation_model_medium_cherry': ['Valid', 'Not Valid'],
    'validation_model_desert_oak': ['Valid', 'Not Valid'],
    'validation_model_graphite_walnut': ['Valid', 'Not Valid']
}

# Load all models at startup
interpreters = {}
for model_name, model_path in MODELS.items():
    try:
        interpreters[model_name] = Interpreter(model_path=model_path)
        interpreters[model_name].allocate_tensors()
        logger.info(f"TFLite model {model_name} loaded successfully from {model_path}")
    except Exception as e:
        logger.error(f"Error loading TFLite model {model_name}: {e}")

# Define image dimensions
img_height = 224
img_width = 224
# =========================================================

# ============= RGB CLASSIFIER FUNCTIONS =============
def calculate_euclidean_distance(img_path1, img_path2, resize_to=(300, 300)):
    """
    Calculate the RGB Euclidean distance between two images.
    
    Args:
        img_path1: Path to first image
        img_path2: Path to second image
        resize_to: Tuple (width, height) to resize images for comparison
        
    Returns:
        float: The average RGB Euclidean distance
    """
    try:
        # Load images
        img1 = Image.open(img_path1)
        img2 = Image.open(img_path2)
        
        # Resize images to a standard size for comparison
        img1 = img1.resize(resize_to)
        img2 = img2.resize(resize_to)
        
        # Convert images to RGB if they aren't already
        if img1.mode != 'RGB':
            img1 = img1.convert('RGB')
        if img2.mode != 'RGB':
            img2 = img2.convert('RGB')
        
        # Convert to numpy arrays for efficient calculation
        img1_array = np.array(img1)
        img2_array = np.array(img2)
        
        # Calculate squared differences for each RGB channel
        r_diff = (img1_array[:,:,0].astype(float) - img2_array[:,:,0].astype(float)) ** 2
        g_diff = (img1_array[:,:,1].astype(float) - img2_array[:,:,1].astype(float)) ** 2
        b_diff = (img1_array[:,:,2].astype(float) - img2_array[:,:,2].astype(float)) ** 2
        
        # Sum the channel differences for each pixel
        pixel_diff = np.sqrt(r_diff + g_diff + b_diff)
        
        # Return the average difference across all pixels
        return np.mean(pixel_diff)
    except Exception as e:
        print(f"Error comparing images: {str(e)}")
        return np.nan

def get_image_paths_from_category(category_path, max_images=None):
    """
    Get paths to all images in a category folder.
    
    Args:
        category_path: Path to the category folder
        max_images: Maximum number of images to include (optional, for sampling)
        
    Returns:
        list: List of image paths
    """
    valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}
    
    image_paths = [
        os.path.join(category_path, f) for f in os.listdir(category_path)
        if os.path.isfile(os.path.join(category_path, f)) and
        os.path.splitext(f)[1].lower() in valid_extensions
    ]
    
    # Optionally limit the number of images
    if max_images and len(image_paths) > max_images:
        np.random.seed(42)  # For reproducibility
        image_paths = np.random.choice(image_paths, max_images, replace=False).tolist()
    
    return image_paths

def calculate_image_distribution(input_image_path, dataset_path, max_images_per_category=None, normalize=True):
    """
    Calculate the average RGB Euclidean distance between the input image and
    all images in each category.
    
    Args:
        input_image_path: Path to the input image
        dataset_path: Path to the dataset root folder
        max_images_per_category: Maximum number of images to use from each category
        normalize: Whether to normalize distances to 0-100 scale
        
    Returns:
        pandas.Series: Average distances to each category
    """
    if not os.path.exists(input_image_path):
        raise ValueError(f"Input image path does not exist: {input_image_path}")
    
    # Dictionary to store distances
    distances = {cat: [] for cat in CATEGORIES}
    
    print("Calculating distances between input image and each category...")
    
    for category in CATEGORIES:
        category_path = os.path.join(dataset_path, category)
        
        if not os.path.exists(category_path):
            print(f"Warning: Category path not found: {category_path}")
            continue
            
        category_images = get_image_paths_from_category(category_path, max_images_per_category)
        print(f"  Processing {len(category_images)} images from {category}...")
        
        for image_path in category_images:  # Removing tqdm for server environment
            distance = calculate_euclidean_distance(input_image_path, image_path)
            distances[category].append(distance)
    
    # Calculate average distance for each category
    avg_distances = {}
    for category, dist_list in distances.items():
        if dist_list:
            avg_distances[category] = np.nanmean(dist_list)
        else:
            avg_distances[category] = np.nan
    
    # Convert to pandas Series
    distance_profile = pd.Series(avg_distances)
    
    # Normalize if requested
    if normalize:
        normalized_profile = pd.Series({
            category: min(100, distance / 2.55) if not np.isnan(distance) else np.nan
            for category, distance in avg_distances.items()
        })
        return normalized_profile
    else:
        return distance_profile

def load_reference_profiles(csv_path):
    """
    Load reference category profiles from CSV.
    
    Args:
        csv_path: Path to the CSV with category distance profiles
        
    Returns:
        pandas.DataFrame: Reference profiles
    """
    if not os.path.exists(csv_path):
        raise ValueError(f"Reference profiles CSV not found: {csv_path}")
    
    try:
        # Load the CSV
        df = pd.read_csv(csv_path, index_col=0)
        print(f"Loaded reference profiles with shape: {df.shape}")
        return df
    except Exception as e:
        raise ValueError(f"Error loading reference profiles: {str(e)}")

def classify_image(image_profile, reference_profiles):
    """
    Classify the image by finding the most similar category profile.
    
    Args:
        image_profile: Series with distances to each category
        reference_profiles: DataFrame with reference category profiles
        
    Returns:
        tuple: (predicted_category, similarity_scores)
    """
    # Calculate similarity score (using Euclidean distance between profiles)
    similarity_scores = {}
    
    for category in reference_profiles.index:
        category_profile = reference_profiles.loc[category]
        
        # Calculate distance between profiles (lower = more similar)
        profile_distance = euclidean(
            image_profile.fillna(0),  # Replace NaN with 0 for calculation
            category_profile.fillna(0)
        )
        
        # Convert to similarity score (higher = more similar)
        similarity_scores[category] = 1 / (1 + profile_distance)
    
    # Find the most similar category
    similarity_series = pd.Series(similarity_scores)
    predicted_category = similarity_series.idxmax()
    
    return predicted_category, similarity_series

def get_main_category(category):
    """
    Get the main category (in-range or out-of-range) from the detailed category.
    
    Args:
        category: Detailed category name
        
    Returns:
        str: 'in-range' or 'out-of-range'
    """
    if category.startswith('out-of-range'):
        return 'out-of-range'
    elif category.startswith('in-range'):
        return 'in-range'
    else:
        return 'unknown'

def classify_image_api(input_image_path, color="medium-cherry", max_images=20, verbose=False):
    """
    API function for classifying a single image that can be called from external code.
    
    Args:
        input_image_path: Path to the input image
        color: Wood color to use for classification (medium-cherry, desert-oak, graphite-walnut)
        max_images: Maximum number of images to use per category for comparison
        verbose: Whether to print detailed information
        
    Returns:
        dict: Classification results
    """
    try:
        # Get configuration for the specified color
        if color not in COLOR_CONFIG:
            raise ValueError(f"Invalid color: {color}. Valid options are: {list(COLOR_CONFIG.keys())}")
        
        config = COLOR_CONFIG[color]
        dataset_path = config["dataset_path"]
        reference_csv = config["reference_csv"]
        
        if verbose:
            print(f"Processing image with color: {color}")
            print(f"Dataset path: {dataset_path}")
            print(f"Reference CSV: {reference_csv}")
        
        # Load reference profiles
        reference_profiles = load_reference_profiles(reference_csv)
        
        # Calculate distance profile
        image_profile = calculate_image_distribution(
            input_image_path, dataset_path, max_images, normalize=True
        )
        
        # Classify the image
        predicted_category, similarity_scores = classify_image(image_profile, reference_profiles)
        
        # Get main category
        main_category = get_main_category(predicted_category)
        
        # Prepare result
        result = {
            "image_path": input_image_path,
            "color": color,
            "predicted_category": predicted_category,
            "main_category": main_category,
            "similarity_scores": {k: float(v) for k, v in similarity_scores.items()},
            "distance_profile": {k: float(v) for k, v in image_profile.items()}
        }
        
        if verbose:
            print(f"Predicted category: {predicted_category}")
            print(f"Main category: {main_category}")
        
        return result
        
    except Exception as e:
        error_message = f"Error classifying image: {str(e)}"
        print(error_message)
        import traceback
        traceback.print_exc()
        return {"error": error_message}
# =========================================================

# ============= TENSORFLOW FUNCTIONS =============
def preprocess_image(base64_string, color_space='lab'):
    """
    Preprocess image with optional color space conversion
    
    Args:
        base64_string: Base64 encoded image
        color_space: Target color space ('rgb', 'lab', or 'hsv')
        
    Returns:
        Preprocessed numpy array ready for model input
    """
    try:
        # Decode the base64 string into a numpy array of bytes
        img_bytes = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_bytes, np.uint8)
        
        # Decode the image using OpenCV (this reads in BGR format)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            logger.error("Could not decode image")
            return None

        # Convert from BGR to RGB (to match training)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Resize the image to the target dimensions
        img_resized = cv2.resize(img_rgb, (img_width, img_height))
        
        # Process according to the requested color space
        if color_space.lower() == 'lab':
            # Convert RGB to LAB using OpenCV (matches training)
            img_lab = cv2.cvtColor(img_resized, cv2.COLOR_RGB2LAB)
            
            # Normalize LAB values as done during training:
            # L channel in range [0, 100], so divide by 100
            # a and b channels in range [-127, 127], so shift by +127 and divide by 255
            l_channel = img_lab[:, :, 0] / 100.0
            a_channel = (img_lab[:, :, 1] + 127) / 255.0
            b_channel = (img_lab[:, :, 2] + 127) / 255.0
            
            # Stack channels to form the final image array
            img_array = np.stack([l_channel, a_channel, b_channel], axis=-1)
        elif color_space.lower() == 'hsv':
            # Convert RGB to HSV using OpenCV and normalize to [0, 1]
            img_hsv = cv2.cvtColor(img_resized, cv2.COLOR_RGB2HSV)
            img_array = img_hsv / 255.0
        else:  # Default: use RGB and normalize to [0, 1]
            img_array = img_resized / 255.0

        # Add batch dimension and convert to float32 (as expected by TFLite)
        img_array = np.expand_dims(img_array, axis=0).astype(np.float32)

        logger.info(f"Preprocessed image in {color_space} color space with shape {img_array.shape}")
        return img_array

    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return None


def predict_classification(interpreter, preprocessed_image, class_names):
    try:
        # Get input and output details
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        # Set the tensor to point to the input data to be inferred
        interpreter.set_tensor(input_details[0]['index'], preprocessed_image)

        # Run the inference
        interpreter.invoke()

        # Retrieve the output
        output_data = interpreter.get_tensor(output_details[0]['index'])
        logger.info(f"Output data shape: {output_data.shape}")

        probabilities = output_data[0]
        logger.info(f"Probabilities before softmax: {probabilities}")

        # Apply softmax if not already applied in the model
        probabilities = tf.nn.softmax(probabilities).numpy()
        logger.info(f"Probabilities after softmax: {probabilities}")

        predicted_index = np.argmax(probabilities)
        logger.info(f"Predicted index: {predicted_index}")

        if predicted_index >= len(class_names):
            return {"error": "Predicted index out of range for class names"}

        predicted_class = class_names[predicted_index]
        confidence = float(probabilities[predicted_index] * 100)

        # Return all class probabilities
        all_probabilities = {class_name: float(prob * 100) for class_name, prob in zip(class_names, probabilities)}

        return {
            "predicted_class": predicted_class, 
            "confidence": confidence,
            "all_probabilities": all_probabilities
        }

    except Exception as e:
        logger.error(f"Error during classification prediction: {e}")
        return {"error": f"An error occurred during prediction: {str(e)}"}

def predict_regression(interpreter, preprocessed_image):
    try:
        # Get input and output details
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        # Set the tensor to point to the input data to be inferred
        interpreter.set_tensor(input_details[0]['index'], preprocessed_image)

        # Run the inference
        interpreter.invoke()

        # Retrieve the output - regression models typically output a single value
        output_data = interpreter.get_tensor(output_details[0]['index'])
        
        # Get the predicted value (usually a single number)
        predicted_value = float(output_data[0][0])
        
        return {
            "predicted_value": predicted_value
        }

    except Exception as e:
        logger.error(f"Error during regression prediction: {e}")
        return {"error": f"An error occurred during prediction: {str(e)}"}
        
def predict_binary_classification(interpreter, preprocessed_image, threshold=0.5):
    """
    Process a binary classification model with sigmoid output.
    
    Args:
        interpreter: TFLite interpreter loaded with model
        preprocessed_image: Image data prepared for the model
        threshold: Threshold value (between 0-1) to determine "in range"
    
    Returns:
        Dictionary with results including in_range status and confidence
    """
    try:
        # Get input and output details
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        # Set the tensor to point to the input data to be inferred
        interpreter.set_tensor(input_details[0]['index'], preprocessed_image)

        # Run the inference
        interpreter.invoke()

        # Retrieve the output
        output_data = interpreter.get_tensor(output_details[0]['index'])
        logger.info(f"Binary model output shape: {output_data.shape}")
        logger.info(f"Binary model raw output: {output_data}")
        
        # Extract the prediction value (should be a value between 0 and 1)
        if len(output_data.shape) == 2 and output_data.shape[1] == 1:
            # If output shape is [1,1], extract the single value (common for sigmoid output)
            prediction_value = float(output_data[0][0])
        else:
            # If output shape is different, assume it's logits and apply sigmoid
            prediction_value = float(tf.nn.sigmoid(output_data[0][0]).numpy())
        
        logger.info(f"Binary prediction value: {prediction_value}, threshold: {threshold}")
        
        # Determine if it's "in range" using the threshold
        is_in_range = prediction_value > threshold
        
        # Calculate confidence (0-100%)
        # This simply uses how far the prediction is from 0.5 (maximum uncertainty)
        # 0.5 = 50% confidence, 0.0 or 1.0 = 100% confidence
        raw_confidence = abs(prediction_value - 0.5) * 2 * 100
        
        return {
            "is_in_range": is_in_range,
            "confidence": raw_confidence,
            "raw_prediction": prediction_value
        }
    
    except Exception as e:
        logger.error(f"Error during binary classification prediction: {e}")
        return {"error": f"An error occurred during prediction: {str(e)}"}
# =========================================================

# ============= API ENDPOINTS =============
@app.route('/', methods=['GET'])
def health_check():
    """
    Simple endpoint to check if the backend server is running
    """
    return "Backend server is running! All systems operational."

@app.after_request
def add_cors_headers(response):
    """Add CORS headers to every response"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON data from request
        data = request.json
        
        image = data.get("image")
        mime_type = data.get("mimeType")

        if not image or not mime_type:
            return jsonify({"error": "Invalid input - missing image or mimeType"}), 400

        # Use default model
        interpreter = interpreters.get('default')
        if not interpreter:
            return jsonify({"error": "Model not loaded"}), 500

        preprocessed_image = preprocess_image(image)
        if preprocessed_image is None:
            return jsonify({"error": "Error processing image"}), 400

        result = predict_classification(
            interpreter, 
            preprocessed_image, 
            CLASS_NAMES['default']
        )
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in prediction endpoint: {e}")
        return jsonify({"error": str(e)}), 500

# Medium Cherry Validation Endpoint
@app.route('/validate/medium_cherry', methods=['POST'])
def validate_medium_cherry():
    try:
        # Hardcoded threshold for medium cherry
        THRESHOLD = 0.5082  # Adjust as needed
        
        # Get JSON data from request
        data = request.json
        
        image = data.get("image")
        mime_type = data.get("mimeType")
        color_space = "lab"  # Always use LAB color space

        if not image or not mime_type:
            return jsonify({"error": "Invalid input - missing image or mimeType"}), 400

        # Use the medium cherry validation model
        model_name = 'validation_model_medium_cherry'
        interpreter = interpreters.get(model_name)
        if not interpreter:
            return jsonify({"error": f"Model {model_name} not loaded"}), 500

        preprocessed_image = preprocess_image(image, color_space)
        if preprocessed_image is None:
            return jsonify({"error": "Error processing image"}), 400

        # Run prediction with hardcoded threshold
        prediction_result = predict_binary_classification(
            interpreter, 
            preprocessed_image,
            threshold=THRESHOLD
        )
        
        if "error" in prediction_result:
            return jsonify(prediction_result), 500
        
        # Return the result in the expected format
        result = {
            "result": prediction_result["is_in_range"],
            "confidence": prediction_result["confidence"],
            "position_score": 0.0,  # Neutral position score
            "color_space_used": color_space
        }
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in medium cherry validation endpoint: {e}")
        return jsonify({"error": str(e)}), 500

# Desert Oak Validation Endpoint
@app.route('/validate/desert_oak', methods=['POST'])
def validate_desert_oak():
    try:
        # Hardcoded threshold for desert oak
        THRESHOLD = 0.507  # Adjust as needed
        
        # Get JSON data from request
        data = request.json
        
        image = data.get("image")
        mime_type = data.get("mimeType")
        color_space = "lab"  # Always use LAB color space

        if not image or not mime_type:
            return jsonify({"error": "Invalid input - missing image or mimeType"}), 400

        # Use the desert oak validation model
        model_name = 'validation_model_desert_oak'
        interpreter = interpreters.get(model_name)
        if not interpreter:
            return jsonify({"error": f"Model {model_name} not loaded"}), 500

        preprocessed_image = preprocess_image(image, color_space)
        if preprocessed_image is None:
            return jsonify({"error": "Error processing image"}), 400

        # Run prediction with hardcoded threshold
        prediction_result = predict_binary_classification(
            interpreter, 
            preprocessed_image,
            threshold=THRESHOLD
        )
        
        if "error" in prediction_result:
            return jsonify(prediction_result), 500
        
        # Return the result in the expected format
        result = {
            "result": prediction_result["is_in_range"],
            "confidence": prediction_result["confidence"],
            "position_score": 0.0,  # Neutral position score
            "color_space_used": color_space
        }
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in desert oak validation endpoint: {e}")
        return jsonify({"error": str(e)}), 500

# Graphite Walnut Validation Endpoint
@app.route('/validate/graphite_walnut', methods=['POST'])
def validate_graphite_walnut():
    try:
        # Hardcoded threshold for graphite walnut
        THRESHOLD = 0.5125339031219482  # Adjust as needed
        
        # Get JSON data from request
        data = request.json
        
        image = data.get("image")
        mime_type = data.get("mimeType")
        color_space = "lab"  # Always use LAB color space

        if not image or not mime_type:
            return jsonify({"error": "Invalid input - missing image or mimeType"}), 400

        # Fix typo in model name (if needed)
        model_name = 'validation_model_graphite_walnut'
        interpreter = interpreters.get(model_name)
        if not interpreter:
            return jsonify({"error": f"Model {model_name} not loaded"}), 500

        preprocessed_image = preprocess_image(image, color_space)
        if preprocessed_image is None:
            return jsonify({"error": "Error processing image"}), 400

        # Run prediction with hardcoded threshold
        prediction_result = predict_binary_classification(
            interpreter, 
            preprocessed_image,
            threshold=THRESHOLD
        )
        
        if "error" in prediction_result:
            return jsonify(prediction_result), 500
        
        # Return the result in the expected format
        result = {
            "result": prediction_result["is_in_range"],
            "confidence": prediction_result["confidence"],
            "position_score": 0.0,  # Neutral position score
            "color_space_used": color_space
        }
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in graphite walnut validation endpoint: {e}")
        return jsonify({"error": str(e)}), 500

# Full report endpoint
@app.route('/generate-full-report', methods=['POST'])
def generate_full_report():
    try:
        # Get JSON data from request
        data = request.json
        
        image = data.get("image")
        mime_type = data.get("mimeType")
        color_space = data.get("colorSpace", "lab")

        if not image or not mime_type:
            return jsonify({"error": "Invalid input - missing image or mimeType"}), 400

        # 1. First, run the main classification model to determine wood type
        main_interpreter = interpreters.get('default')
        if not main_interpreter:
            return jsonify({"error": "Default model not loaded"}), 500

        preprocessed_image = preprocess_image(image, color_space)
        if preprocessed_image is None:
            return jsonify({"error": "Error processing image"}), 400

        main_result = predict_classification(
            main_interpreter, 
            preprocessed_image, 
            CLASS_NAMES['default']
        )
        
        wood_type = main_result.get("predicted_class")
        logger.info(f"Detected wood type: {wood_type}")
        
        # Initialize report structure
        report = {
            "wood_type": {
                "classification": wood_type,
                "confidence": main_result.get("confidence"),
                "all_probabilities": main_result.get("all_probabilities")
            },
            "color_space_used": color_space,
            "specialized_tests": {}
        }
        
        # 2. If it's graphite walnut, run all graphite walnut tests
        if wood_type == "graphite_walnut":
            logger.info("Running specialized tests for graphite walnut")
            
            # 2.1 Binary classification
            binary_model_name = 'validation_model_graphite_walnut'
            binary_interpreter = interpreters.get(binary_model_name)
            if binary_interpreter:
                binary_result = predict_classification(
                    binary_interpreter,
                    preprocessed_image,
                    CLASS_NAMES[binary_model_name]
                )
                report["specialized_tests"]["validation"] = binary_result
            '''
            # 2.2 Multiclass classification
            multiclass_model_name = 'multiclass_model_graphite_walnut'
            multiclass_interpreter = interpreters.get(multiclass_model_name)
            if multiclass_interpreter:
                multiclass_result = predict_classification(
                    multiclass_interpreter,
                    preprocessed_image,
                    CLASS_NAMES[multiclass_model_name]
                )
                report["specialized_tests"]["multiclass"] = multiclass_result
            
            # 2.3 Regression model
            regression_model_name = 'regression_model_graphite_walnut'
            regression_interpreter = interpreters.get(regression_model_name)
            if regression_interpreter:
                regression_result = predict_regression(
                    regression_interpreter,
                    preprocessed_image
                )
                report["specialized_tests"]["regression"] = regression_result
                '''

                
        if wood_type == "medium_cherry":
            logger.info("Running specialized tests for medium cherry")
            
            # 2.1 Binary classification
            binary_model_name = 'validation_model_medium_cherry'
            binary_interpreter = interpreters.get(binary_model_name)
            if binary_interpreter:
                binary_result = predict_classification(
                    binary_interpreter,
                    preprocessed_image,
                    CLASS_NAMES[binary_model_name]
                )

                report["specialized_tests"]["validation"] = binary_result

        if wood_type == "desert_oak":
            logger.info("Running specialized tests for desert oak")
            
            # 2.1 Binary classification
            binary_model_name = 'validation_model_desert_oak'
            binary_interpreter = interpreters.get(binary_model_name)
            if binary_interpreter:
                binary_result = predict_classification(
                    binary_interpreter,
                    preprocessed_image,
                    CLASS_NAMES[binary_model_name]
                )
                report["specialized_tests"]["validation"] = binary_result
            '''
            # 2.2 Multiclass classification
            multiclass_model_name = 'multiclass_model_graphite_walnut'
            multiclass_interpreter = interpreters.get(multiclass_model_name)
            if multiclass_interpreter:
                multiclass_result = predict_classification(
                    multiclass_interpreter,
                    preprocessed_image,
                    CLASS_NAMES[multiclass_model_name]
                )
                report["specialized_tests"]["multiclass"] = multiclass_result
            
            # 2.3 Regression model
            regression_model_name = 'regression_model_graphite_walnut'
            regression_interpreter = interpreters.get(regression_model_name)
            if regression_interpreter:
                regression_result = predict_regression(
                    regression_interpreter,
                    preprocessed_image
                )
                report["specialized_tests"]["regression"] = regression_result
            '''
        return jsonify(report)
    
    except Exception as e:
        logger.error(f"Error generating full report: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/rgb-difference', methods=['POST'])
def calculate_rgb_difference():
    """
    Calculate the RGB Euclidean difference between two images.
    
    Expects a POST request with JSON containing:
    {
        "image1": "base64_encoded_image_string",
        "image2": "base64_encoded_image_string"
    }
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data or 'image1' not in data or 'image2' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing required image data'
            }), 400
        
        # Decode base64 images
        try:
            image1_data = base64.b64decode(data['image1'].split(',')[1] if ',' in data['image1'] else data['image1'])
            image2_data = base64.b64decode(data['image2'].split(',')[1] if ',' in data['image2'] else data['image2'])
        except:
            return jsonify({
                'status': 'error',
                'message': 'Invalid base64 image data'
            }), 400
        
        # Open images with PIL
        image1 = Image.open(io.BytesIO(image1_data))
        image2 = Image.open(io.BytesIO(image2_data))
        
        # Resize images to a standard size for comparison
        standard_size = (300, 300)
        image1 = image1.resize(standard_size)
        image2 = image2.resize(standard_size)
        
        # Convert images to RGB if they aren't already
        if image1.mode != 'RGB':
            image1 = image1.convert('RGB')
        if image2.mode != 'RGB':
            image2 = image2.convert('RGB')
        
        # Convert to numpy arrays for efficient calculation
        img1_array = np.array(image1)
        img2_array = np.array(image2)
        
        # Calculate Euclidean distance using numpy directly
        r_diff = (img1_array[:,:,0].astype(float) - img2_array[:,:,0].astype(float)) ** 2
        g_diff = (img1_array[:,:,1].astype(float) - img2_array[:,:,1].astype(float)) ** 2
        b_diff = (img1_array[:,:,2].astype(float) - img2_array[:,:,2].astype(float)) ** 2
        
        # Sum the channel differences for each pixel
        pixel_diff = np.sqrt(r_diff + g_diff + b_diff)
        
        # Average difference across all pixels
        difference = np.mean(pixel_diff)
        
        # Return the result
        return jsonify({
            'status': 'success',
            'difference': float(difference),
            'normalized_difference': float(min(100, difference / 2.55)),  # Normalize to 0-100 scale
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error calculating RGB difference: {str(e)}'
        }), 500

# RGB Classifier Endpoint
@app.route('/api/classify-wood', methods=['POST', 'OPTIONS'])
def classify_wood_rgb():
    """
    Endpoint to classify wood veneer images using base64-encoded images.
    
    Expects JSON with:
    - 'image': A base64-encoded image string
    - 'color': One of 'medium-cherry', 'desert-oak', or 'graphite-walnut'
    
    Returns:
    - JSON with classification results
    """
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        return response
        
    try:
        # Get request data and log it for debugging
        data = request.get_json()
        logger.info(f"Received request to /api/classify-wood with data keys: {list(data.keys()) if data else None}")
        
        # Check if image data is provided
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            }), 400
        
        # Get base64 image data
        base64_image = data.get('image', '')
        
        # Check if the base64 string is empty
        if not base64_image:
            return jsonify({
                'success': False,
                'error': 'Empty image data'
            }), 400
        
        # Get color parameter
        color = data.get('color', 'medium-cherry')
        
        # Validate color
        if color not in VALID_COLORS:
            return jsonify({
                'success': False,
                'error': f'Invalid color. Must be one of: {", ".join(VALID_COLORS)}'
            }), 400
        
        logger.info(f"Processing image with color: {color}")
        
        # Process the base64 image string (remove data URI prefix if present)
        if ',' in base64_image:
            # Handle data URLs like "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
            base64_image = base64_image.split(',', 1)[1]
        
        # Decode base64 image data
        try:
            image_data = base64.b64decode(base64_image)
        except Exception as e:
            logger.error(f"Invalid base64 image data: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Invalid base64 image data: {str(e)}'
            }), 400
        
        # Create a temporary file to save the image
        temp_dir = tempfile.gettempdir()
        temp_filename = f"{uuid.uuid4()}.jpg"
        temp_path = os.path.join(temp_dir, temp_filename)
        
        # Save the decoded image data to the temporary file
        try:
            # First verify it's a valid image by opening it with PIL
            image = Image.open(io.BytesIO(image_data))
            image.save(temp_path)
            logger.info(f"Saved image to temporary file: {temp_path}")
        except Exception as e:
            logger.error(f"Invalid image data: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Invalid image data: {str(e)}'
            }), 400
        
        # Process the image using our integrated classifier function
        try:
            result = classify_image_api(temp_path, color, max_images=20, verbose=True)
            logger.info(f"Classification result: {result}")
        except Exception as e:
            logger.error(f"Error in classification: {str(e)}")
            import traceback
            traceback.print_exc()
            result = {"error": f"Classification error: {str(e)}"}
        
        # Clean up the temporary file
        try:
            os.remove(temp_path)
        except Exception as e:
            logger.warning(f"Failed to delete temporary file: {e}")
        
        # Check if there was an error in classification
        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
        
        # Return success response
        return jsonify({
            'success': True,
            'color': color,
            'predicted_category': result['predicted_category'],
            'main_category': result['main_category'],
            'similarity_scores': result['similarity_scores']
        })
        
    except Exception as e:
        logger.error(f"Error in classify_wood_rgb endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Error processing image: {str(e)}'
        }), 500
# =========================================================

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3050, debug=True)