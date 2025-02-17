import React, { useState, useEffect } from "react";
import { View, Button, Image, StyleSheet, Alert, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>("classify"); // Default selection
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

  const ANALYSIS_OPTIONS = [
    { label: "Classify Image", value: "classify" },
    { label: "Analyze Medium Cherry", value: "medium_cherry" },
    { label: "Analyze Graphite Walnut", value: "graphite_walnut" },
  ];

  useEffect(() => {
    (async () => {
      const galleryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(galleryStatus.status === "granted");

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === "granted");
    })();
  }, []);

  // Pick Image from gallery
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

  // Analyze Image based on selected analysis option
  const analyzeImage = async () => {
    if (!imageUri || !imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    const selectedUrl = BACKEND_URLS[selectedAnalysis];

    try {
      const response = await axios.post(
        selectedUrl,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log(`${selectedAnalysis} Response:`, response.data);

      // Check response format based on expected endpoints
      if (response.data?.position_score !== undefined) {
        const resultText = `Position: [-1, 1] ${response.data.position_score.toFixed(
          2
        )}\nConfidence: ${response.data.confidence.toFixed(2)}%`;
        setResponseText(resultText);
        Alert.alert(
          `${
            ANALYSIS_OPTIONS.find((o) => o.value === selectedAnalysis)?.label
          } Result`,
          resultText
        );
      } else if (response.data?.predicted_class) {
        const resultText = `Predicted Class: ${
          response.data.predicted_class
        }\nConfidence: ${response.data.confidence.toFixed(2)}%`;
        setResponseText(resultText);
        Alert.alert(
          `${
            ANALYSIS_OPTIONS.find((o) => o.value === selectedAnalysis)?.label
          } Result`,
          resultText
        );
      } else {
        Alert.alert("Error", "Unexpected response from backend. Check logs.");
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("Upload Error:", error.response?.data || error.message);
        Alert.alert(
          "Error",
          `Failed to analyze image: ${
            error.response?.data?.error || error.message
          }`
        );
      }
    }
  };

  // Reupload resets image and response state
  const reuploadImage = () => {
    setImageUri(null);
    setImageBase64(null);
    setResponseText(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="Select Image" onPress={pickImage} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Take Picture" onPress={takePicture} />
      </View>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

      {imageUri && (
        <>
          {/* Dropdown to select analysis type */}
          <View style={styles.dropdownContainer}>
            <Picker
              selectedValue={selectedAnalysis}
              onValueChange={(itemValue) => setSelectedAnalysis(itemValue)}
            >
              {ANALYSIS_OPTIONS.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>

          {/* Analyze and Reupload Buttons */}
          <View style={styles.buttonRow}>
            <View style={styles.flexButton}>
              <Button title="Analyze" onPress={analyzeImage} />
            </View>
            <View style={styles.flexButton}>
              <Button title="Reupload" onPress={reuploadImage} />
            </View>
          </View>
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
  image: {
    width: 300,
    height: 300,
    marginVertical: 10,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  dropdownContainer: {
    width: 250,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#fff",
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
});
