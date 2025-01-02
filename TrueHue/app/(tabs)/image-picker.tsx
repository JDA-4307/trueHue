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

  const BACKEND_URL = "http://localhost:3000/analyze"; // Replace with your backend's actual URL
  const BACKEND_URL_TEST = "http://localhost:3000/test"; // Replace with your backend's actual URL

  useEffect(() => {
    (async () => {
      const galleryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(galleryStatus.status === "granted");
    })();
  }, []);

  const pickImage = async () => {
    if (hasGalleryPermission === false) {
      return Alert.alert("Permission for media access not granted.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Optional aspect ratio
      quality: 0.1, // 0 to 1, where 1 is highest quality
      base64: true, // Backend will handle base64 conversion
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri); // Set the image URI for display
      setImageBase64(result.assets[0].base64); // Store the Base64 string
    }
  };

  const uploadImage = async () => {
    if (!imageUri) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }
    if (!imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    try {
      // Fetch the file at the `imageUri` and convert it to a Blob
      //const imageResponse = await fetch(imageUri);
      //const blob = await imageResponse.blob();

      // Create a new FormData object and append the Blob
      //const formData = new FormData();
      //formData.append("photo", blob, "photo.jpg"); // Blob + filename

      // Send the image to the backend
      console.log("after backend call");
      console.log(imageBase64);
      //const reponse = await axios.post(BACKEND_URL_TEST, )

      const response = await axios.post(
        BACKEND_URL_TEST,
        {
          image: imageBase64,
          mimeType: "image/jpeg",
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      console.log("after backend call");

      const data = response.data;

      if (data?.candidates?.length > 0) {
        const resultText = data.candidates[0].content.parts[0].text;
        setResponseText(resultText);
        Alert.alert("Analysis Result", resultText);
      } else {
        Alert.alert(
          "Error",
          "No response or unexpected format from the backend. Check console logs."
        );
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
      <Button title="Select Image" onPress={pickImage} />
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
