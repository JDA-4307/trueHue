from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from predict import preprocess_image, predict_in_range

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route("/predict-in-range", methods=["POST"])
def predict_route():
    data = request.get_json()
    image_base64 = data.get("image")
    veneer_type = data.get("veneer_type")

    if not image_base64 or not veneer_type:
        return jsonify({"error": "Missing image or veneer_type"}), 400

    try:
        image_array = preprocess_image(image_base64)
        result = predict_in_range(image_array, veneer_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)