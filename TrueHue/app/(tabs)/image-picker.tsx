
import React, { useState, useEffect } from "react";
import {
  View, Button, Image, StyleSheet, Alert, Text, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>("classify"); // Default selection
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [positionScore, setPositionScore] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

  const getPositionLabel = (position_score: number): string => {
    if (position_score < -0.5) return "Far Left";
    if (position_score < -0.1) return "Left";
    if (position_score < 0.1) return "Center";
    if (position_score < 0.5) return "Right";
    return "Far Right";
  };
  
  // Analyze image based on selected analysis option
  const analyzeImage = async () => {
    if (!imageUri || !imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }
  
    setIsLoading(true); // Start loading
    const selectedUrl = BACKEND_URLS[selectedAnalysis];
  
    try {
      const response = await axios.post(
        selectedUrl,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );
  
      console.log(`${selectedAnalysis} Response:`, response.data);
  
      if (response.data?.position_score !== undefined) {
        setPositionScore(response.data.position_score);
        setConfidence(response.data.confidence);
  
        const resultText = `Position: ${getPositionLabel(response.data.position_score)} (${response.data.position_score.toFixed(2)})\nConfidence: ${response.data.confidence.toFixed(2)}%`;
        setResponseText(resultText);
      } else if (response.data?.predicted_class) {
        const resultText = `Predicted Class: ${response.data.predicted_class}\nConfidence: ${response.data.confidence.toFixed(2)}%`;
        setResponseText(resultText);
      } else {
        Alert.alert("Error", "Unexpected response from backend.");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Upload Error:", error.response?.data || error.message);
        Alert.alert("Error", `Failed to analyze image: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setIsLoading(false); 
    }
  };
  

  // Reupload resets image and response state
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
          {/* Dropdown to select analysis type */}
          <View style={styles.dropdownContainer}>
            <Picker 
              selectedValue={selectedAnalysis} 
              onValueChange={(itemValue) => setSelectedAnalysis(itemValue)}
            >
              {ANALYSIS_OPTIONS.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>

          {/* Loading indicator */}
          {isLoading && <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />}

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

          {/* Position Indicator & Confidence Bar */}
          {positionScore !== null && (
            <View style={styles.spectrumContainer}>
              <View style={[styles.spectrumFill, { width: `${((positionScore + 1) / 2) * 100}%` }]} />
              <Text style={styles.positionLabel}>
                Position: {getPositionLabel(positionScore)} ({positionScore.toFixed(2)})
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
  loader: {
    marginTop: 20,
  },
  spectrumContainer: { 
    width: "80%", 
    height: 20, 
    backgroundColor: "#ddd", 
    borderRadius: 10, 
    overflow: "hidden", 
    marginTop: 10 
  },

  spectrumFill: { 
    height: "100%", 
    backgroundColor: "orange" 
  },

  positionLabel: { 
    textAlign: "center", 
    marginTop: 5, 
    fontSize: 16, 
    fontWeight: "bold" 
  },
});
