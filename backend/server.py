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
    'multiclass_model_graphite_walnut': './assets/models/multiclass_model_graphite_walnut.tflite',
    'regression_model_graphite_walnut': './assets/models/regression_model_graphite_walnut.tflite'
}

# Define class names for each model
CLASS_NAMES = {
    'default': ['desert_oak', 'graphite_walnut', 'medium_cherry'],
    'binary_model_graphite_walnut': ['Not GraphiteWalnut', 'graphiteWalnut'],
    'multiclass_model_graphite_walnut': ['mediumCherry', 'desertOak', 'graphiteWalnut', 'other'],
    # No classes for regression model
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
                
            # Future extension point for medium cherry and desert oak tests
            
        return jsonify(report)

    except Exception as e:
        logger.error(f"Error generating full report: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3050, debug=False)