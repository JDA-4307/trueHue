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
  classify: `${API_URL}/predict`, // TFLite classification
  medium_cherry: `${API_URL}/validate/medium_cherry`, // Medium cherry validation (updated)
  desert_oak: `${API_URL}/validate/desert_oak`, // Desert oak validation (new)
  graphite_walnut: `${API_URL}/validate/graphite_walnut`, // Graphite walnut validation (updated)

  // New endpoints
  generateFullReport: `${API_URL}/generate-full-report`, // Full analysis report
  binary_graphite_walnut: `${API_URL}/predict/binary/graphite_walnut`, // Binary classification
  multiclass_graphite_walnut: `${API_URL}/predict/multiclass/graphite_walnut`, // Multiclass classification
  regression_graphite_walnut: `${API_URL}/predict/regression/graphite_walnut`, // Regression model

  rgbDifference: `${API_URL}/rgb-difference`, // rgb difference calculation given two images

  classify_wood: `${API_URL}/api/classify-wood`, // rgb classifier
  baseUrl: API_URL, // Base URL for constructing other endpoints
};

export default {
  API_URL,
  BACKEND_URLS,
};
