// Full rewritten image-picker.tsx with veneer type selection and updated analyze logic
import React, { useState, useEffect } from "react";
import {
  View,
  Button,
  Image,
  StyleSheet,
  Alert,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BACKEND_URLS } from "../../config";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [veneerType, setVeneerType] = useState<
    "graphite_walnut" | "medium_cherry" | "dessert_oak" | null
  >(null);

  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      setResponseText(null);
    }
  };

  const analyzeImage = async () => {
    if (!imageBase64 || !veneerType) {
      Alert.alert("Missing input", "Please select an image and veneer type.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${BACKEND_URLS.baseUrl}/predict-in-range`,
        {
          image: imageBase64,
          veneer_type: veneerType,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const prediction = response.data.prediction;
      const confidence = response.data.confidence;

      const resultText = `Veneer Type: ${veneerType.replaceAll("_", " ")}\nPrediction: ${prediction}\nConfidence: ${confidence}%`;
      setResponseText(resultText);
      Alert.alert("Prediction", resultText);
    } catch (err: any) {
      console.error("Prediction error:", err);
      Alert.alert("Error", err?.response?.data?.error || "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Color Range Validator</Text>

      <View style={{ marginBottom: 15 }}>
        <Text style={styles.label}>Select Veneer Type:</Text>
        {[
          "graphite_walnut",
          "medium_cherry",
          "dessert_oak",
        ].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.button, veneerType === type && styles.selectedButton]}
            onPress={() => setVeneerType(type as any)}
          >
            <Text style={styles.buttonText}>{type.replaceAll("_", " ")}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Select Image</Text>
      </TouchableOpacity>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.image} />
      )}

      {imageUri && veneerType && (
        <TouchableOpacity style={styles.analyzeButton} onPress={analyzeImage}>
          <Text style={styles.buttonText}>Analyze</Text>
        </TouchableOpacity>
      )}

      {isLoading && <ActivityIndicator size="large" color="#2196F3" />}

      {responseText && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{responseText}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    marginVertical: 5,
    borderRadius: 6,
    alignItems: "center",
    minWidth: 200,
  },
  selectedButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  image: {
    width: 300,
    height: 300,
    marginVertical: 10,
  },
  analyzeButton: {
    backgroundColor: "#f57c00",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    minWidth: 200,
    marginTop: 10,
  },
  resultBox: {
    marginTop: 20,
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
  },
  resultText: {
    fontSize: 16,
    textAlign: "center",
  },
});
