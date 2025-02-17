import React, { useState, useEffect } from "react";
import {
  View,
  Button,
  Image,
  StyleSheet,
  Alert,
  Text,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [positionScore, setPositionScore] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasGalleryPermission, setHasGalleryPermission] = useState<
    boolean | null
  >(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);

  // Backend URLs (update these URLs as needed)
  const BACKEND_URLS: { [key: string]: string } = {
    classify: "http://localhost:3050/predict_tflite", // TFLite classification
    medium_cherry: "http://localhost:3050/predict_medium", // Medium cherry regression
    graphite_walnut: "http://localhost:3050/predict_graphite", // Graphite walnut regression
  };

  useEffect(() => {
    (async () => {
      const galleryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(galleryStatus.status === "granted");

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === "granted");
    })();
  }, []);

  // Pick image from gallery
  const pickImage = async () => {
    if (hasGalleryPermission === false) {
      return Alert.alert("Permission for media access not granted.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  // Take picture with camera
  const takePicture = async () => {
    if (hasCameraPermission === false) {
      return Alert.alert("Permission for camera access is not granted.");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  // Helper: Get a label based on the regression score
  const getPositionLabel = (score: number): string => {
    if (score < -0.5) return "Far Left";
    if (score < -0.1) return "Left";
    if (score < 0.1) return "Center";
    if (score < 0.5) return "Right";
    return "Far Right";
  };

  // Analyze image: first classify, then automatically run the appropriate regression model
  const analyzeImage = async () => {
    if (!imageUri || !imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Run classification model
      const classResponse = await axios.post(
        BACKEND_URLS.classify,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );

      if (!classResponse.data?.predicted_class) {
        Alert.alert(
          "Error",
          "Unexpected classification response from backend."
        );
        return;
      }

      // Normalize the predicted class: lowercase and remove spaces
      const predictedClass: string = classResponse.data.predicted_class
        .toLowerCase()
        .replace(/\s+/g, "");
      const classConfidence: number = classResponse.data.confidence;
      console.log("Classification Result:", predictedClass, classConfidence);

      // 2. Decide which regression model to call based on classification result
      let regressionUrl: string | undefined;
      if (predictedClass.includes("mediumcherry")) {
        regressionUrl = BACKEND_URLS.medium_cherry;
      } else if (predictedClass.includes("graphitewalnut")) {
        regressionUrl = BACKEND_URLS.graphite_walnut;
      } else {
        // If classification returns an unknown type, just display classification results.
        const resultText = `Predicted Class: ${
          classResponse.data.predicted_class
        }\nConfidence: ${classConfidence.toFixed(2)}%`;
        setResponseText(resultText);
        Alert.alert("Classification Result", resultText);
        return;
      }

      // 3. Run the regression model
      const regResponse = await axios.post(
        regressionUrl,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );

      if (regResponse.data?.position_score === undefined) {
        Alert.alert("Error", "Unexpected regression response from backend.");
        return;
      }

      const regPositionScore: number = regResponse.data.position_score;
      const regConfidence: number = regResponse.data.confidence;
      setPositionScore(regPositionScore);
      setConfidence(regConfidence);

      // 4. Build result text combining classification and regression results
      const resultText =
        `Predicted Class: ${classResponse.data.predicted_class}\n` +
        `Classification Confidence: ${classConfidence.toFixed(2)}%\n\n` +
        `Regression Position: ${getPositionLabel(
          regPositionScore
        )} (${regPositionScore.toFixed(2)})\n` +
        `Regression Confidence: ${regConfidence.toFixed(2)}%`;
      setResponseText(resultText);
      Alert.alert("Analysis Result", resultText);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Analyze Error:", error.response?.data || error.message);
        Alert.alert(
          "Error",
          `Failed to analyze image: ${
            error.response?.data?.error || error.message
          }`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reupload: resets image and response state
  const reuploadImage = () => {
    setImageUri(null);
    setImageBase64(null);
    setResponseText(null);
    setPositionScore(null);
    setConfidence(null);
  };

  return (
    <View style={styles.container}>
      {/* Show image selection buttons only if no image has been picked */}
      {!imageUri && (
        <>
          <View style={styles.buttonContainer}>
            <Button title="Select Image" onPress={pickImage} />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Take Picture" onPress={takePicture} />
          </View>
        </>
      )}

      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

      {imageUri && (
        <>
          {/* Loading indicator */}
          {isLoading && (
            <ActivityIndicator
              size="large"
              color="#0000ff"
              style={styles.loader}
            />
          )}

          {/* Analyze and Reupload Buttons */}
          {!isLoading && (
            <View style={styles.buttonRow}>
              <View style={styles.flexButton}>
                <Button title="Analyze" onPress={analyzeImage} />
              </View>
              <View style={styles.flexButton}>
                <Button title="Reupload" onPress={reuploadImage} />
              </View>
            </View>
          )}

          {/* Spectrum Bar: shows position and confidence if regression was run */}
          {positionScore !== null && (
            <View style={styles.spectrumContainer}>
              <View
                style={[
                  styles.spectrumFill,
                  { width: `${((positionScore + 1) / 2) * 100}%` },
                ]}
              />
              <Text style={styles.positionLabel}>
                Position: {getPositionLabel(positionScore)} (
                {positionScore.toFixed(2)})
              </Text>
              <Text>Confidence: {confidence?.toFixed(2)}%</Text>
            </View>
          )}
        </>
      )}

      {/* Response Text */}
      {responseText && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseText}>{responseText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  image: {
    width: 300,
    height: 300,
    marginVertical: 10,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 10,
  },
  flexButton: {
    flex: 0,
    marginHorizontal: 5,
    minWidth: 140,
  },
  responseContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  responseText: {
    fontSize: 16,
    textAlign: "center",
  },
  loader: {
    marginTop: 20,
  },
  spectrumContainer: {
    width: "80%",
    height: 20,
    backgroundColor: "#ddd",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
  },
  spectrumFill: {
    height: "100%",
    backgroundColor: "orange",
  },
  positionLabel: {
    textAlign: "center",
    marginTop: 5,
    fontSize: 16,
    fontWeight: "bold",
  },
});
