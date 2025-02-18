import React, { useState, useEffect } from "react";
import {
  View,
  Button,
  Image,
  StyleSheet,
  Alert,
  Text,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
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
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);

  // Backend URLs (update these URLs as needed)
  const backendURLs: { [key: string]: string } = {
    classify: "http://10.91.65.250:3050/predict_tflite",
    medium_cherry: "http://10.91.65.250:3050/predict_medium",
    graphite_walnut: "http://10.91.65.250:3050/predict_graphite",
  };

  useEffect(() => {
    (async () => {
      try {
        const galleryStatus =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        //console.log("Gallery permissions:", galleryStatus);
        setHasGalleryPermission(galleryStatus.status === "granted");

        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        //console.log("Camera permissions:", cameraStatus);
        setHasCameraPermission(cameraStatus.status === "granted");
      } catch (error) {
        console.error("Error requesting permissions", error);
      }
    })();
  }, []);

  // Pick image from gallery
  const pickImage = async () => {
    console.log("pickImage called");
    if (hasGalleryPermission === false) {
      console.log("Gallery permission not granted");
      return Alert.alert("Permission for media access not granted.");
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: true,
      });
      //console.log("ImagePicker result:", result);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        //console.log("Image selected:", result.assets[0].uri);
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || null);
      }
    } catch (error) {
      console.error("Error picking image", error);
      Alert.alert("Error", "Something went wrong while picking the image.");
    }
  };

  // Take picture with camera
  const takePicture = async () => {
    console.log("takePicture called");
    if (hasCameraPermission === false) {
      console.log("Camera permission not granted");
      return Alert.alert("Permission for camera access is not granted.");
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: true,
      });
      //console.log("Camera result:", result);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        //console.log("Picture taken:", result.assets[0].uri);
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || null);
      }
    } catch (error) {
      console.error("Error taking picture", error);
      Alert.alert("Error", "Something went wrong while taking the picture.");
    }
  };

  const getPositionLabel = (position_score: number): string => {
    if (position_score < -0.5) return "Far Left";
    if (position_score < -0.1) return "Left";
    if (position_score < 0.1) return "Center";
    if (position_score < 0.5) return "Right";
    return "Far Right";
  };

  // Analyze image: first classify, then run appropriate regression model
  const analyzeImage = async () => {
    console.log("analyzeImage called");
    if (!imageUri || !imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Run classification model
      const classResponse = await axios.post(
        backendURLs.classify,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("Classification response:", classResponse.data);
      if (!classResponse.data?.predicted_class) {
        Alert.alert(
          "Error",
          "Unexpected classification response from backend."
        );
        return;
      }
      const predictedClass: string = classResponse.data.predicted_class
        .toLowerCase()
        .replace(/\s+/g, "");
      const classConfidence: number = classResponse.data.confidence;
      console.log(
        "Predicted class:",
        predictedClass,
        "Confidence:",
        classConfidence
      );

      // 2. Decide which regression model to call
      let regressionUrl: string | undefined;
      if (predictedClass.includes("mediumcherry")) {
        regressionUrl = backendURLs.medium_cherry;
      } else if (predictedClass.includes("graphitewalnut")) {
        regressionUrl = backendURLs.graphite_walnut;
      } else {
        const resultText = `Predicted Class: ${
          classResponse.data.predicted_class
        }\nConfidence: ${classConfidence.toFixed(2)}%`;
        setResponseText(resultText);
        Alert.alert("Classification Result", resultText);
        return;
      }

      // 3. Run regression model
      const regResponse = await axios.post(
        regressionUrl,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );
      //console.log("Regression response:", regResponse.data);
      if (regResponse.data?.position_score === undefined) {
        Alert.alert("Error", "Unexpected regression response from backend.");
        return;
      }
      const regPositionScore: number = regResponse.data.position_score;
      const regConfidence: number = regResponse.data.confidence;
      setPositionScore(regPositionScore);
      setConfidence(regConfidence);

      // 4. Build result text
      const resultText =
        `Predicted Class: ${classResponse.data.predicted_class}\n` +
        `Classification Confidence: ${classConfidence.toFixed(2)}%\n\n` +
        `Regression Position: ${getPositionLabel(
          regPositionScore
        )} (${regPositionScore.toFixed(2)})\n` +
        `Regression Confidence: ${regConfidence.toFixed(2)}%`;
      console.log("Final result text:", resultText);
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
      } else {
        console.error("Analyze Error:", error);
        Alert.alert("Error", "An unexpected error occurred during analysis.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reupload: reset image and response state
  const reuploadImage = () => {
    console.log("Reuploading image");
    setImageUri(null);
    setImageBase64(null);
    setResponseText(null);
    setPositionScore(null);
    setConfidence(null);
  };

  return (
    <View style={styles.container}>
      {!imageUri && (
        <>
          <TouchableOpacity
            style={styles.unifiedButton}
            onPress={() => {
              console.log("Unified button pressed, opening modal");
              setShowPickerModal(true);
            }}
          >
            <Text style={styles.unifiedButtonText}>Upload Image</Text>
          </TouchableOpacity>
          <Modal
            transparent={true}
            animationType="slide"
            visible={showPickerModal}
            onRequestClose={() => {
              console.log("Modal closed");
              setShowPickerModal(false);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Image Source</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={pickImage}
                >
                  <Text style={styles.modalButtonText}>
                    Select from Gallery
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={takePicture}
                >
                  <Text style={styles.modalButtonText}>Take a Picture</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    console.log("Cancel pressed");
                    setShowPickerModal(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      {imageUri && (
        <>
          {isLoading && (
            <ActivityIndicator
              size="large"
              color="#0000ff"
              style={styles.loader}
            />
          )}
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
  unifiedButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginVertical: 10,
  },
  unifiedButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  cancelButton: {
    borderBottomWidth: 0,
    marginTop: 10,
  },
  modalButtonText: {
    fontSize: 18,
    color: "#007AFF",
  },
  image: {
    width: 300,
    height: 300,
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
