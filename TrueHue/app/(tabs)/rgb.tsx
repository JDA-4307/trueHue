import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BACKEND_URLS } from "../../config"; // Import from config

// Define just the range thresholds as global variables
let VERY_SIMILAR_THRESHOLD = 10;
let MODERATE_THRESHOLD = 50;

// Add these constants at the top of your file, before your component
const COLOR_PALETTE = {
  GREEN: "#4CAF50",
  YELLOW: "#FFC107",
  RED: "#F44336",
} as const;

export default function VeneerComparisonScreen() {
  // State for first image
  const [image1Uri, setImage1Uri] = useState<string | null>(null);
  const [image1Base64, setImage1Base64] = useState<string | null>(null);

  // State for second image
  const [image2Uri, setImage2Uri] = useState<string | null>(null);
  const [image2Base64, setImage2Base64] = useState<string | null>(null);

  // State for results and loading
  const [difference, setDifference] = useState<number | null>(null);
  const [normalizedDifference, setNormalizedDifference] = useState<
    number | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Permission states
  const [hasGalleryPermission, setHasGalleryPermission] = useState<
    boolean | null
  >(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);

  // Request permissions on component mount
  useEffect(() => {
    (async () => {
      const galleryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(galleryStatus.status === "granted");

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === "granted");
    })();
  }, []);

  // Pick image from gallery for image 1
  const pickImage1 = async () => {
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
      setImage1Uri(result.assets[0].uri);
      setImage1Base64(result.assets[0].base64 || null);
      // Reset previous results when a new image is selected
      setDifference(null);
      setNormalizedDifference(null);
    }
  };

  // Take picture with camera for image 1
  const takePicture1 = async () => {
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
      setImage1Uri(result.assets[0].uri);
      setImage1Base64(result.assets[0].base64 || null);
      // Reset previous results when a new image is selected
      setDifference(null);
      setNormalizedDifference(null);
    }
  };

  // Pick image from gallery for image 2
  const pickImage2 = async () => {
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
      setImage2Uri(result.assets[0].uri);
      setImage2Base64(result.assets[0].base64 || null);
      // Reset previous results when a new image is selected
      setDifference(null);
      setNormalizedDifference(null);
    }
  };

  // Take picture with camera for image 2
  const takePicture2 = async () => {
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
      setImage2Uri(result.assets[0].uri);
      setImage2Base64(result.assets[0].base64 || null);
      // Reset previous results when a new image is selected
      setDifference(null);
      setNormalizedDifference(null);
    }
  };

  // Calculate RGB difference between the two images
  const calculateDifference = async () => {
    if (!image1Base64 || !image2Base64) {
      Alert.alert("Missing Images", "Please select both images to compare.");
      return;
    }

    setIsLoading(true);
    try {
      // Determine the API endpoint URL - use a default if not specified in config
      const endpointUrl =
        BACKEND_URLS.rgbDifference ||
        `${BACKEND_URLS.baseUrl || "http://localhost:3050"}/rgb-difference`;

      // Call the API endpoint
      const response = await axios.post(
        endpointUrl,
        {
          image1: image1Base64,
          image2: image2Base64,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      // Process the response
      if (response.data.status === "success") {
        setDifference(response.data.difference);
        setNormalizedDifference(response.data.normalized_difference);
      } else {
        Alert.alert("Error", response.data.message || "Unknown error occurred");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("API Error:", error.response?.data || error.message);
        Alert.alert(
          "Error",
          `Failed to calculate difference: ${
            error.response?.data?.message || error.message
          }`
        );
      } else {
        console.error("Unexpected error:", error);
        Alert.alert("Error", "An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all state
  const resetImages = () => {
    setImage1Uri(null);
    setImage1Base64(null);
    setImage2Uri(null);
    setImage2Base64(null);
    setDifference(null);
    setNormalizedDifference(null);
  };

  // Get color based on difference value for visualization
  const getDifferenceColor = (value: number): string => {
    console.log(`diff value: ${value}`);
    if (value < VERY_SIMILAR_THRESHOLD) return COLOR_PALETTE.GREEN;
    if (value < MODERATE_THRESHOLD) return COLOR_PALETTE.YELLOW;
    return COLOR_PALETTE.RED;
  };

  // Get interpretation text based on difference value
  const getDifferenceInterpretation = (value: number): string => {
    if (value < VERY_SIMILAR_THRESHOLD) {
      return "These veneer samples are very similar in color.";
    }
    if (value < MODERATE_THRESHOLD) {
      return "These veneer samples have moderate color differences.";
    }
    return "These veneer samples have significant color differences.";
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Wood Veneer Comparison</Text>
        <Text style={styles.subtitle}>
          Compare two veneer samples to see how similar they are
        </Text>

        {/* Image 1 Section */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionHeader}>Veneer Sample 1</Text>

          {!image1Uri ? (
            <View style={styles.imagePlaceholder}>
              <TouchableOpacity style={styles.button} onPress={pickImage1}>
                <Text style={styles.buttonText}>Select Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={takePicture1}>
                <Text style={styles.buttonText}>Take Picture</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Image source={{ uri: image1Uri }} style={styles.image} />
              <TouchableOpacity
                style={[styles.button, styles.smallButton]}
                onPress={pickImage1}
              >
                <Text style={styles.buttonText}>Change Image</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Image 2 Section */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionHeader}>Veneer Sample 2</Text>

          {!image2Uri ? (
            <View style={styles.imagePlaceholder}>
              <TouchableOpacity style={styles.button} onPress={pickImage2}>
                <Text style={styles.buttonText}>Select Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={takePicture2}>
                <Text style={styles.buttonText}>Take Picture</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Image source={{ uri: image2Uri }} style={styles.image} />
              <TouchableOpacity
                style={[styles.button, styles.smallButton]}
                onPress={pickImage2}
              >
                <Text style={styles.buttonText}>Change Image</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {(image1Uri || image2Uri) && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.compareButton,
                (!image1Uri || !image2Uri) && styles.disabledButton,
              ]}
              onPress={calculateDifference}
              disabled={!image1Uri || !image2Uri || isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Calculating..." : "Calculate Difference"}
              </Text>
              {isLoading && (
                <ActivityIndicator color="#fff" style={styles.buttonLoader} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={resetImages}
            >
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results Section */}
        {difference !== null && normalizedDifference !== null && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Comparison Results</Text>

            <View style={styles.resultValueContainer}>
              <View
                style={[
                  styles.resultBadge,
                  { backgroundColor: getDifferenceColor(normalizedDifference) },
                ]}
              >
                <Text style={styles.resultValue}>
                  {normalizedDifference.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.resultLabel}>RGB Euclidean Difference</Text>
            </View>

            <View style={styles.differenceBarContainer}>
              <View style={styles.differenceBar}>
                <View
                  style={[
                    styles.differenceBarFill,
                    {
                      width: `${Math.min(100, normalizedDifference)}%`,
                      backgroundColor: getDifferenceColor(normalizedDifference),
                    },
                  ]}
                />
              </View>
              <View style={styles.barLabels}>
                <Text style={styles.barLabelLeft}>Similar</Text>
                <Text style={styles.barLabelRight}>Different</Text>
              </View>
            </View>

            <Text style={styles.interpretationText}>
              {getDifferenceInterpretation(normalizedDifference)}
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>What does this mean?</Text>
              <Text style={styles.infoText}>
                The RGB Euclidean difference measures the distance between
                colors in RGB space. A lower value indicates more similar colors
                between the veneer samples. This can help determine if two wood
                samples will match visually when placed together.
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  imageSection: {
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
    height: 200,
    borderRadius: 5,
    padding: 20,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 5,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    flexDirection: "row",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  smallButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 10,
  },
  compareButton: {
    flex: 0.7,
    backgroundColor: "#4CAF50",
    marginRight: 10,
  },
  resetButton: {
    flex: 0.3,
    backgroundColor: "#f44336",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  buttonLoader: {
    marginLeft: 10,
  },
  resultsContainer: {
    width: "100%",
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  resultValueContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  resultBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  resultValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  resultLabel: {
    fontSize: 16,
    color: "#333",
  },
  differenceBarContainer: {
    width: "100%",
    marginBottom: 20,
  },
  differenceBar: {
    height: 20,
    backgroundColor: "#eee",
    borderRadius: 10,
    overflow: "hidden",
  },
  differenceBarFill: {
    height: "100%",
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  barLabelLeft: {
    fontSize: 14,
    color: "#4CAF50",
  },
  barLabelRight: {
    fontSize: 14,
    color: "#F44336",
  },
  interpretationText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  infoBox: {
    backgroundColor: "#E3F2FD",
    padding: 15,
    borderRadius: 5,
    width: "100%",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1565C0",
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
});
