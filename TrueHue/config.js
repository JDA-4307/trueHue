// config.js
import Constants from "expo-constants";

// Get the API URL from environment variables or use default
const API_URL = "http://localhost:3050";
/*
const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:3050";
*/

export const BACKEND_URLS = {
  classify: `${API_URL}/predict_tflite`, // TFLite classification
  medium_cherry: `${API_URL}/predict_medium`, // Medium cherry regression
  graphite_walnut: `${API_URL}/predict_graphite`, // Graphite walnut regression
};

export default {
  API_URL,
  BACKEND_URLS,
};
