import json
import base64
import io
import logging
import numpy as np
import cv2
import joblib
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from tensorflow.lite.python.interpreter import Interpreter
from tensorflow.keras.preprocessing.image import img_to_array

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

#############################
# TFLite Model Initialization
#############################
logger.info("Loading TFLite model")
tflite_model_path = './model.tflite'
try:
    interpreter = Interpreter(model_path=tflite_model_path)
    interpreter.allocate_tensors()
    logger.info(f"TFLite model loaded successfully from {tflite_model_path}")
except Exception as e:
    logger.error(f"Error loading TFLite model: {e}")
    raise e

# Get input and output details for TFLite
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Image dimensions for TFLite model
img_height = 224
img_width = 224

# Define class names (ensure these match your model's outputs)
class_names = ['mediumCherry', 'desertOak', 'graphiteWalnut']

def preprocess_tflite_image(base64_string):
    try:
        # Decode the base64 string and open image
        img_bytes = base64.b64decode(base64_string)
        img_io = io.BytesIO(img_bytes)
        img = Image.open(img_io).convert('RGB')
        # Resize and convert to numpy array
        img = img.resize((img_width, img_height))
        img_array = img_to_array(img)
        # Normalize and expand dimensions
        img_array = (img_array / 255.0).astype(np.float32)
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        logger.error(f"Error processing image for TFLite: {e}")
        return None

def predict_tflite_image(base64_image):
    preprocessed_image = preprocess_tflite_image(base64_image)
    if preprocessed_image is None:
        return {"error": "Error processing image"}
    logger.info(f"Preprocessed image shape: {preprocessed_image.shape}")
    # Set the input tensor and run inference
    interpreter.set_tensor(input_details[0]['index'], preprocessed_image)
    interpreter.invoke()
    output_data = interpreter.get_tensor(output_details[0]['index'])
    logger.info(f"Raw output data: {output_data}")
    probabilities = tf.nn.softmax(output_data[0]).numpy()
    logger.info(f"Probabilities after softmax: {probabilities}")
    predicted_index = int(np.argmax(probabilities))
    if predicted_index >= len(class_names):
        return {"error": "Predicted index out of range for class names"}
    predicted_class = class_names[predicted_index]
    confidence = float(probabilities[predicted_index] * 100)
    return {"predicted_class": predicted_class, "confidence": confidence}

#############################
# Regression Models Initialization
#############################

# Load Graphite Walnut Regression Model
graphite_model_filename = "./graphite_walnut_regression_model.pkl"
try:
    model_graphite = joblib.load(graphite_model_filename)
    logger.info(f"Graphite walnut regression model loaded from {graphite_model_filename}")
except Exception as e:
    logger.error(f"Error loading graphite regression model: {e}")
    raise e

# Load Medium Cherry Regression Model
medium_model_filename = "./medium_cherry_regression_model.pkl"
try:
    model_medium = joblib.load(medium_model_filename)
    logger.info(f"Medium cherry regression model loaded from {medium_model_filename}")
except Exception as e:
    logger.error(f"Error loading medium cherry regression model: {e}")
    raise e

def extract_lab_features(image):
    """Extract L*, a*, b* mean values from an image."""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_mean = np.mean(lab[:, :, 0])
    a_mean = np.mean(lab[:, :, 1])
    b_mean = np.mean(lab[:, :, 2])
    return np.array([l_mean, a_mean, b_mean])

def decode_cv2_image(base64_string):
    """Decode a base64 string into an OpenCV image."""
    try:
        img_bytes = base64.b64decode(base64_string)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Failed to decode image.")
        return image
    except Exception as e:
        raise ValueError(f"Error decoding image: {e}")

def predict_position_graphite(image):
    """Predict veneer position using the graphite walnut regression model."""
    features = extract_lab_features(image)
    position_score = model_graphite.predict([features])[0]
    return position_score

def predict_position_medium(image):
    """Predict veneer position using the medium cherry regression model."""
    features = extract_lab_features(image)
    position_score = model_medium.predict([features])[0]
    return position_score

def compute_confidence_score(position_score):
    """Convert position score to a confidence percentage (0-100%)."""
    return 100 * (1 - abs(position_score))

#############################
# Flask Endpoints
#############################

@app.route("/", methods=["GET"])
def home():
    return "Backend is running!"

# TFLite prediction endpoint
@app.route("/predict_tflite", methods=["POST"])
def predict_tflite():
    try:
        data = request.get_json()
        if not data or 'image' not in data or 'mimeType' not in data:
            return jsonify({"error": "Missing 'image' or 'mimeType' in request body."}), 400
        result = predict_tflite_image(data['image'])
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error in /predict_tflite: {e}")
        return jsonify({"error": str(e)}), 500

# Graphite walnut regression endpoint
@app.route("/predict_graphite", methods=["POST"])
def predict_graphite():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"error": "Missing 'image' in request body."}), 400
        image = decode_cv2_image(data['image'])
        position_score = predict_position_graphite(image)
        confidence = compute_confidence_score(position_score)
        result = {
            "position_score": round(position_score, 2),
            "confidence": round(confidence, 2)
        }
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error in /predict_graphite: {e}")
        return jsonify({"error": str(e)}), 500

# Medium cherry regression endpoint
@app.route("/predict_medium", methods=["POST"])
def predict_medium():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"error": "Missing 'image' in request body."}), 400
        image = decode_cv2_image(data['image'])
        position_score = predict_position_medium(image)
        confidence = compute_confidence_score(position_score)
        result = {
            "position_score": round(position_score, 2),
            "confidence": round(confidence, 2)
        }
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error in /predict_medium: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="10.2.82.117", port=3050, debug=True)
