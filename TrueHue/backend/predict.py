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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Path to TFLite model
tflite_model_path = './model.tflite'

# Load the TFLite model (no Core ML delegate needed; Metal will be used automatically)
try:
    interpreter = Interpreter(model_path=tflite_model_path)
    interpreter.allocate_tensors()
    logger.info(f"TFLite model loaded successfully from {tflite_model_path}")
except Exception as e:
    logger.error(f"Error loading TFLite model: {e}")
    sys.exit(1)

# Get input and output details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Define image dimensions
img_height = 224
img_width = 224

# Define class names (ensure this matches your model's output)
class_names = ['mediumCherry', 'desertOak', 'graphiteWalnut']

def preprocess_image(base64_string):
    try:
        # Decode the base64 string
        img_bytes = base64.b64decode(base64_string)

        # Create an in-memory file
        img_io = io.BytesIO(img_bytes)

        # Load the image using PIL and ensure it's RGB
        img = Image.open(img_io).convert('RGB')

        # Resize the image
        img = img.resize((img_width, img_height))

        # Convert to numpy array
        img_array = img_to_array(img)

        # Normalize pixel values
        img_array = img_array / 255.0

        # Add a batch dimension
        img_array = np.expand_dims(img_array, axis=0)

        # Convert to float32 as TFLite models typically expect float32 input
        img_array = img_array.astype(np.float32)

        return img_array

    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return None

def predict_image(base64_image):
    try:
        preprocessed_image = preprocess_image(base64_image)
        if preprocessed_image is None:
            return {"error": "Error processing image"}

        logger.info(f"Preprocessed image shape: {preprocessed_image.shape}")

        # Set the tensor to point to the input data to be inferred
        interpreter.set_tensor(input_details[0]['index'], preprocessed_image)

        # Run the inference
        interpreter.invoke()

        # Retrieve the output
        output_data = interpreter.get_tensor(output_details[0]['index'])
        logger.info(f"Output data: {output_data}")

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

        return {"predicted_class": predicted_class, "confidence": confidence}

    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        return {"error": "An error occurred during prediction"}


if __name__ == "__main__":
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)

        image = data.get("image")
        mime_type = data.get("mimeType")

        if not image or not mime_type:
            print(json.dumps({"error": "Invalid input"}))
            sys.exit(1)

        result = predict_image(image)
        print(json.dumps(result))

    except Exception as e:
        logger.error(f"Error in main script: {e}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
