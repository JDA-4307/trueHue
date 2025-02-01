import React, { useState, useEffect } from "react";
import { View, Button, Image, StyleSheet, Alert, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState<
    boolean | null
  >(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);

  // Backend URLs
  const BACKEND_URL_TEST = "http://10.2.82.76:3050/test";
  const BACKEND_URL_MEDIUM_CHERRY =
    "http://10.2.82.76:3050/predict_medium_cherry";

  useEffect(() => {
    (async () => {
      const galleryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(galleryStatus.status === "granted");

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === "granted");
    })();
  }, []);

  // Pick Image
  const pickImage = async () => {
    if (hasGalleryPermission === false) {
      return Alert.alert("Permission for media access not granted.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  // Take Picture
  const takePicture = async () => {
    if (hasCameraPermission === false) {
      return Alert.alert("Permission for camera access is not granted.");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  // Upload Image to the /test API
  const uploadImageToTest = async () => {
    if (!imageUri || !imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    try {
      const response = await axios.post(
        BACKEND_URL_TEST,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Test Response:", response.data);

      if (response.data?.predicted_class) {
        const resultText = `Predicted Class: ${
          response.data.predicted_class
        }\nConfidence: ${response.data.confidence.toFixed(2)}%`;
        setResponseText(resultText);
        Alert.alert("Analysis Result", resultText);
      } else {
        Alert.alert("Error", "Unexpected response from backend. Check logs.");
      }
    } catch (error) {
      console.error("Upload Error:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        `Failed to analyze image: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  };

  // Upload Image to the /predict_medium_cherry API
  const uploadImageToMediumCherry = async () => {
    if (!imageUri || !imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    try {
      const response = await axios.post(
        BACKEND_URL_MEDIUM_CHERRY,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Medium Cherry Response:", response.data);

      if (response.data?.position_score !== undefined) {
        const resultText = `Position: (-1, 1) ${response.data.position_score.toFixed(
          2
        )}\nConfidence: ${response.data.confidence.toFixed(2)}%`;
        setResponseText(resultText);
        Alert.alert("Medium Cherry Analysis", resultText);
      } else {
        Alert.alert("Error", "Unexpected response from backend. Check logs.");
      }
    } catch (error) {
      console.error("Upload Error:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        `Failed to analyze image: ${
          error.response?.data?.error || error.message
        }`
      );
    }
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
          <View style={styles.uploadButton}>
            <Button
              title="Analyze Image (Test API)"
              onPress={uploadImageToTest}
            />
          </View>
          <View style={styles.uploadButton}>
            <Button
              title="Analyze Medium Cherry"
              onPress={uploadImageToMediumCherry}
            />
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
  },
  buttonContainer: {
    marginVertical: 10,
  },
  uploadButton: {
    marginTop: 20,
  },
  responseContainer: {
    paddingHorizontal: 20,
  },
  responseText: {
    fontSize: 16,
    textAlign: "center",
  },
});
