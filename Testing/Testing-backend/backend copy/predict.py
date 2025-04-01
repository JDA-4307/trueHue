import base64
import io
import numpy as np
from PIL import Image
import tensorflow as tf

# Load all TFLite interpreters
interpreters = {
    "graphite_walnut": tf.lite.Interpreter(model_path="assets/models/graphite_validation_model.tflite"),
    "medium_cherry": tf.lite.Interpreter(model_path="assets/models/medium_validation_model.tflite"),
    "dessert_oak": tf.lite.Interpreter(model_path="assets/models/dessertoak_validation_model.tflite"),
}

# Allocate tensors for each interpreter
for interpreter in interpreters.values():
    interpreter.allocate_tensors()

def preprocess_image(image_base64):
    image_data = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_data)).convert("RGB")
    image = image.resize((224, 224))  # Assumes model input is 224x224
    image_array = np.array(image, dtype=np.float32) / 255.0
    image_array = np.expand_dims(image_array, axis=0)
    return image_array

def predict_in_range(image_array, veneer_type):
    interpreter = interpreters.get(veneer_type)
    if interpreter is None:
        return {"error": f"Model for '{veneer_type}' not found."}

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    interpreter.set_tensor(input_details[0]['index'], image_array)
    interpreter.invoke()

    output = interpreter.get_tensor(output_details[0]['index'])
    probability = float(output[0][0])

    prediction = "in-range" if probability > 0.5 else "out-of-range"
    confidence = probability if prediction == "in-range" else 1.0 - probability

    return {
        "prediction": prediction,
        "confidence": round(confidence * 100, 2)
    }
