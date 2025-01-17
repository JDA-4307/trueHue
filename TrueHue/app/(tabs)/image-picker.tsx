import React, { useState, useEffect } from "react";
import { View, Button, Image, StyleSheet, Alert, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  //const BACKEND_URL = "http://localhost:3000/analyze"; // Replace with your backend's actual URL
  const BACKEND_URL_TEST = "https://1f89-128-61-160-175.ngrok-free.app/test"; //need to start ngrok session
  //const BACKEND_URL = "http://localhost:3000/analyze"; // Replace with your backend's actual URL
  //const BACKEND_URL_TEST = "http://localhost:3000/test";
  //const BACKEND_URL_TEST = "http://10.91.102.175:3000/test"; // ip on gatech network

  useEffect(() => {
    (async () => {
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();
      const galleryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (
        cameraPermission.status === "granted" &&
        galleryPermission.status === "granted"
      ) {
        setPermissionsGranted(true);
      } else {
        setPermissionsGranted(false);
        Alert.alert(
          "Permissions required",
          "Camera and gallery access are needed."
        );
      }
    })();
  }, []);

  const pickImage = async () => {
    if (!permissionsGranted) {
      return Alert.alert(
        "Permission denied",
        "Access to gallery is not granted."
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const takePicture = async () => {
    if (!permissionsGranted) {
      return Alert.alert(
        "Permission denied",
        "Access to camera is not granted."
      );
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const uploadImage = async () => {
    if (!imageBase64) {
      Alert.alert(
        "No image selected",
        "Please select or take a picture first."
      );
      return;
    }

    try {
      const response = await axios.post(
        BACKEND_URL_TEST,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response.data;

      if (data?.predicted_class) {
        const resultText = `Predicted Class: ${
          data.predicted_class
        }\nConfidence: ${data.confidence.toFixed(2)}%`;
        setResponseText(resultText);
        Alert.alert("Analysis Result", resultText);
      } else {
        Alert.alert("Error", "Unexpected response format from the backend.");
      }
    } catch (error) {
      console.error("Upload Error:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        `Failed to analyze image: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Select Image from Gallery" onPress={pickImage} />
      <Button title="Take a Picture" onPress={takePicture} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      {imageUri && (
        <View style={styles.uploadButton}>
          <Button title="Analyze Image" onPress={uploadImage} />
        </View>
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
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  image: { width: 300, height: 300, marginTop: 20 },
  uploadButton: { marginTop: 20 },
  responseContainer: { marginTop: 20, paddingHorizontal: 20 },
  responseText: { fontSize: 16, textAlign: "center" },
});
