import React, { useState } from "react";
import { View, Button, Image, StyleSheet, Alert, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);

  const API_KEY = "bd3dbf2245d7d7c1c58acd3b85018f06"; // Replace with your imgbb API key
  const API_URL = "https://api.imgbb.com/1/upload";

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        "Media library access is needed to select a picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: true, // Enable Base64 encoding
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri); // For display
      setImageBase64(result.assets[0].base64 || null); // Base64 for API
    }
  };

  const uploadImage = async () => {
    if (!imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    try {
      // Clean Base64 string to ensure no headers are included
      const cleanedBase64 = imageBase64.startsWith("data:")
        ? imageBase64.split(",")[1]
        : imageBase64;

      // Form the API URL with expiration and API key
      const url = `${API_URL}?expiration=600&key=${API_KEY}`;

      // Prepare the payload as URL-encoded data
      const payload = new URLSearchParams();
      payload.append("image", cleanedBase64);

      // Send the POST request
      const response = await axios.post(url, payload.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      // Handle the response
      const { data, success, status } = response.data;

      if (success && status === 200) {
        const uploadedUrl = data.url;
        const viewerUrl = data.url_viewer;
        const deleteUrl = data.delete_url;

        setResponseText(`Uploaded Image URL: ${uploadedUrl}`);
        Alert.alert(
          "Upload Successful",
          `View Image: ${viewerUrl}\nDelete URL: ${deleteUrl}`
        );
      } else {
        Alert.alert("Error", "Image upload was not successful.");
      }
    } catch (error) {
      console.error("Upload Error:", error.response || error.message);
      Alert.alert(
        "Error",
        `Failed to upload image: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Select Image" onPress={pickImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      {imageUri && (
        <View style={styles.uploadButton}>
          <Button title="Upload Image" onPress={uploadImage} />
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
