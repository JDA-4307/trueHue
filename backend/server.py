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
from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
import cv2;



app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



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

@app.route('/', methods=['GET'])
def health_check():
    """
    Simple endpoint to check if the backend server is running
    """
    return "Backend server is running! All systems operational."

# Original endpoint


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

# Binary classification endpoint
@app.route('/predict/binary/graphite_walnut', methods=['POST'])
def predict_binary_graphite_walnut():
    try:
        # Get JSON data from request
        data = request.json
        
        image = data.get("image")
        mime_type = data.get("mimeType")
        # Get color space parameter (default to 'lab' for wood color classification)
        color_space = data.get("colorSpace", "lab")

        if not image or not mime_type:
            return jsonify({"error": "Invalid input - missing image or mimeType"}), 400

        # Use binary model
        model_name = 'binary_model_graphite_walnut'
        interpreter = interpreters.get(model_name)
        if not interpreter:
            return jsonify({"error": f"Model {model_name} not loaded"}), 500

        preprocessed_image = preprocess_image(image, color_space)
        if preprocessed_image is None:
            return jsonify({"error": "Error processing image"}), 400

        result = predict_classification(
            interpreter, 
            preprocessed_image, 
            CLASS_NAMES[model_name]
        )
        
        # Add color space info to result
        result["color_space_used"] = color_space
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in binary prediction endpoint: {e}")
        return jsonify({"error": str(e)}), 500

# Multiclass classification endpoint
@app.route('/predict/multiclass/graphite_walnut', methods=['POST'])
def predict_multiclass_graphite_walnut():
    try:
        # Get JSON data from request
        data = request.json
        
        image = data.get("image")
        mime_type = data.get("mimeType")
        # Get color space parameter (default to 'lab' for wood color classification)
        color_space = data.get("colorSpace", "lab")

        if not image or not mime_type:
            return jsonify({"error": "Invalid input - missing image or mimeType"}), 400

        # Use multiclass model
        model_name = 'multiclass_model_graphite_walnut'
        interpreter = interpreters.get(model_name)
        if not interpreter:
            return jsonify({"error": f"Model {model_name} not loaded"}), 500

        preprocessed_image = preprocess_image(image, color_space)
        if preprocessed_image is None:
            return jsonify({"error": "Error processing image"}), 400

        result = predict_classification(
            interpreter, 
            preprocessed_image, 
            CLASS_NAMES[model_name]
        )
        
        # Add color space info to result
        result["color_space_used"] = color_space
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in multiclass prediction endpoint: {e}")
        return jsonify({"error": str(e)}), 500

# Regression endpoint
@app.route('/predict/regression/graphite_walnut', methods=['POST'])
def predict_regression_graphite_walnut():
    try:
        # Get JSON data from request
        data = request.json
        
        image = data.get("image")
        mime_type = data.get("mimeType")
        # Get color space parameter (default to 'lab' for wood color classification)
        color_space = data.get("colorSpace", "lab")

        if not image or not mime_type:
            return jsonify({"error": "Invalid input - missing image or mimeType"}), 400

        # Use regression model
        model_name = 'regression_model_graphite_walnut'
        interpreter = interpreters.get(model_name)
        if not interpreter:
            return jsonify({"error": f"Model {model_name} not loaded"}), 500

        preprocessed_image = preprocess_image(image, color_space)
        if preprocessed_image is None:
            return jsonify({"error": "Error processing image"}), 400

        result = predict_regression(
            interpreter, 
            preprocessed_image
        )
        
        # Add color space info to result
        result["color_space_used"] = color_space
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in regression prediction endpoint: {e}")
        return jsonify({"error": str(e)}), 500

# NEW ENDPOINTS - Wood Validation

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
            binary_model_name = 'binary_model_graphite_walnut'
            binary_interpreter = interpreters.get(binary_model_name)
            if binary_interpreter:
                binary_result = predict_classification(
                    binary_interpreter,
                    preprocessed_image,
                    CLASS_NAMES[binary_model_name]
                )
                report["specialized_tests"]["binary"] = binary_result
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
                
            # Future extension point for medium cherry and desert oak tests
        if wood_type == "medium_cherry":
            logger.info("Running specialized tests for medium cherry")
            
            # 2.1 Binary classification
            binary_model_name = 'binary_model_medium_cherry'
            binary_interpreter = interpreters.get(binary_model_name)
            if binary_interpreter:
                binary_result = predict_classification(
                    binary_interpreter,
                    preprocessed_image,
                    CLASS_NAMES[binary_model_name]
                )
                report["specialized_tests"]["binary"] = binary_result
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
        
        # Calculate Euclidean distance
        difference = calculate_euclidean_distance(img1_array, img2_array)
        
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

def calculate_euclidean_distance(img1_array, img2_array):
    """
    Calculate the average Euclidean distance between corresponding pixels in two images.
    
    Args:
        img1_array: NumPy array of the first image
        img2_array: NumPy array of the second image
        
    Returns:
        float: The average RGB Euclidean distance
    """
    # Ensure both arrays have the same shape
    if img1_array.shape != img2_array.shape:
        raise ValueError("Images must have the same dimensions")
    
    # Calculate squared differences for each RGB channel
    r_diff = (img1_array[:,:,0].astype(float) - img2_array[:,:,0].astype(float)) ** 2
    g_diff = (img1_array[:,:,1].astype(float) - img2_array[:,:,1].astype(float)) ** 2
    b_diff = (img1_array[:,:,2].astype(float) - img2_array[:,:,2].astype(float)) ** 2
    
    # Sum the channel differences for each pixel
    pixel_diff = np.sqrt(r_diff + g_diff + b_diff)
    
    # Return the average difference across all pixels
    return np.mean(pixel_diff)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3050, debug=False)