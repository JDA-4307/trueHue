import base64
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import img_to_array
from PIL import Image
import io
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Path to the TFLite model
tflite_model_path = './model.tflite'

# Load the TFLite model and allocate tensors
try:
    interpreter = tf.lite.Interpreter(model_path=tflite_model_path)
    interpreter.allocate_tensors()
    logger.info(f"TFLite model loaded successfully from {tflite_model_path}")
except Exception as e:
    logger.error(f"Error loading TFLite model: {e}")
    exit(1)

# Get input and output tensor details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Define image dimensions
img_height = 224
img_width = 224

# Define class names (ensure this matches your model's output)
class_names = ['graphiteWalnut', 'mediumCherry', 'mediumWalnut']  # Update accordingly

def preprocess_image(base64_string):
    """
    Preprocesses the base64 encoded image.

    Args:
      base64_string (str): Base64 encoded image string.

    Returns:
      np.ndarray or None: Preprocessed image array or None if processing fails.
    """
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

def encode_image_to_base64(image_path):
    """
    Encodes an image file into a Base64 string.

    Args:
      image_path (str): Path to the image file.

    Returns:
      str or None: Base64 encoded string of the image or None if encoding fails.
    """
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        return encoded_string
    except Exception as e:
        logger.error(f"Error encoding image: {e}")
        return None

def predict_image(base64_image):
    """
    Predicts the class of the image using the TFLite model.

    Args:
      base64_image (str): Base64 encoded image string.

    Returns:
      dict: Dictionary containing the predicted class and confidence score.
    """
    try:
        preprocessed_image = preprocess_image(base64_image)
        if preprocessed_image is None:
            return {"error": "Error processing image"}

        # Set the tensor to point to the input data to be inferred
        interpreter.set_tensor(input_details[0]['index'], preprocessed_image)

        # Run the inference
        interpreter.invoke()

        # Retrieve the output
        output_data = interpreter.get_tensor(output_details[0]['index'])
        probabilities = output_data[0]

        # Apply softmax if not already applied in the model
        if output_details[0]['dtype'] == np.float32:
            probabilities = tf.nn.softmax(probabilities).numpy()
        else:
            probabilities = probabilities.astype(np.float32)

        predicted_index = np.argmax(probabilities)
        predicted_class = class_names[predicted_index]
        confidence = float(probabilities[predicted_index] * 100)

        return {"predicted_class": predicted_class, "confidence": confidence}

    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        return {"error": "An error occurred during prediction"}

# Example usage:
if __name__ == "__main__":
    # Replace with your actual image path
    image_path = "./test-image.jpg"

    base64_image = encode_image_to_base64(image_path)
    if base64_image:
        result = predict_image(base64_image)
        print(result)
    else:
        logger.error("Failed to encode image.")
