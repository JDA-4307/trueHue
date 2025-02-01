import joblib
import cv2
import numpy as np
import sys
import json
import base64
import io
from PIL import Image

# Load the trained model
model_filename = "../assets/models/graphite_walnut_regression_model.pkl"
model = joblib.load(model_filename)

# Function to extract L*, a*, b* values from an image
def extract_lab_features(image):
    """Extract L*, a*, b* mean values from an image."""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_mean = np.mean(lab[:, :, 0])  # Lightness (L*) component
    a_mean = np.mean(lab[:, :, 1])  # Red-Green component
    b_mean = np.mean(lab[:, :, 2])  # Blue-Yellow component
    return np.array([l_mean, a_mean, b_mean])

# Function to decode base64 image
def decode_image(base64_string):
    """Convert base64 image to an OpenCV image."""
    try:
        img_bytes = base64.b64decode(base64_string)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Failed to decode image.")
        return image
    except Exception as e:
        raise ValueError(f"Error decoding image: {e}")

# Function to predict veneer position
def predict_position(image):
    """Predict where a veneer sample falls on the color spectrum."""
    features = extract_lab_features(image)
    position_score = model.predict([features])[0]
    return position_score

# Function to compute confidence score
def compute_confidence_score(position_score):
    """Convert position score to a confidence percentage (0-100%)."""
    return 100 * (1 - abs(position_score))

# Main function
def main():
    try:
        # Read input JSON from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)

        # Extract base64 image
        image_base64 = data.get("image")
        if not image_base64:
            raise ValueError("Missing 'image' in request.")

        # Decode the image
        image = decode_image(image_base64)

        # Predict veneer position
        position_score = predict_position(image)
        confidence = compute_confidence_score(position_score)

        # Return results as JSON
        result = {
            "position_score": round(position_score, 2),
            "confidence": round(confidence, 2)
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

# Ensure script runs properly
if __name__ == "__main__":
    main()
