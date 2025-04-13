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
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BACKEND_URLS } from "../../config"; // Import from config

// Define just the range thresholds as global variables
let VERY_SIMILAR_THRESHOLD = 10;
let MODERATE_THRESHOLD = 50;

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
  const [hasGalleryPermission, setHasGalleryPermission] =
    useState<boolean>(false);
  const [hasCameraPermission, setHasCameraPermission] =
    useState<boolean>(false);

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
    if (value < VERY_SIMILAR_THRESHOLD) return "#4CAF50"; // Green
    if (value < MODERATE_THRESHOLD) return "#FFC107"; // Yellow
    return "#F44336"; // Red
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.appTitle}>Wood Veneer Comparison</Text>
          <Text style={styles.instructionText}>
            Compare two veneer samples to see how similar they are
          </Text>

          {/* Image 1 Section */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionHeader}>Veneer Sample 1</Text>

            {!image1Uri ? (
              <View style={styles.startContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={pickImage1}
                >
                  <Text style={styles.buttonText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={takePicture1}
                >
                  <Text style={styles.secondaryButtonText}>Take a Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.analysisContainer}>
                <View style={styles.imageFrame}>
                  <Image source={{ uri: image1Uri }} style={styles.image} />
                </View>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={pickImage1}
                >
                  <Text style={styles.secondaryButtonText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Image 2 Section */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionHeader}>Veneer Sample 2</Text>

            {!image2Uri ? (
              <View style={styles.startContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={pickImage2}
                >
                  <Text style={styles.buttonText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={takePicture2}
                >
                  <Text style={styles.secondaryButtonText}>Take a Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.analysisContainer}>
                <View style={styles.imageFrame}>
                  <Image source={{ uri: image2Uri }} style={styles.image} />
                </View>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={pickImage2}
                >
                  <Text style={styles.secondaryButtonText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {(image1Uri || image2Uri) && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (!image1Uri || !image2Uri || isLoading) &&
                    styles.disabledButton,
                ]}
                onPress={calculateDifference}
                disabled={!image1Uri || !image2Uri || isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Calculating..." : "Calculate Difference"}
                </Text>
                {isLoading && (
                  <ActivityIndicator
                    color="white"
                    style={styles.buttonLoader}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetImages}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Results Section */}
          {difference !== null && normalizedDifference !== null && (
            <View style={styles.responseCard}>
              <Text style={styles.responseTitle}>Comparison Results</Text>

              <View style={styles.resultValueContainer}>
                <View
                  style={[
                    styles.resultBadge,
                    {
                      backgroundColor: getDifferenceColor(normalizedDifference),
                    },
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
                        backgroundColor:
                          getDifferenceColor(normalizedDifference),
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
                <Text style={styles.responseText}>
                  The RGB Euclidean difference measures the distance between
                  colors in RGB space. A lower value indicates more similar
                  colors between the veneer samples. This can help determine if
                  two wood samples will match visually when placed together.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9F9FC",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F9F9FC",
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: "#35343D",
    textAlign: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  instructionText: {
    fontSize: 17,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  imageSection: {
    width: "100%",
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#35343D",
    marginBottom: 16,
  },
  startContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 16,
  },
  analysisContainer: {
    alignItems: "center",
    width: "100%",
  },
  imageFrame: {
    marginVertical: 20,
    borderRadius: 16,
    padding: 4,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: "#8A3FFC",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8A3FFC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#8A3FFC",
  },
  actionButtonsContainer: {
    flexDirection: "column",
    width: "100%",
    marginVertical: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: "#8A3FFC",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  resetButton: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9D9E3",
    marginTop: 4,
  },
  disabledButton: {
    backgroundColor: "#D9D9E3",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#8A3FFC",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  buttonLoader: {
    marginLeft: 10,
  },
  responseCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#35343D",
    marginBottom: 16,
  },
  responseText: {
    fontSize: 16,
    color: "#35343D",
    lineHeight: 24,
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
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  resultLabel: {
    fontSize: 16,
    color: "#666",
  },
  differenceBarContainer: {
    width: "100%",
    marginBottom: 20,
  },
  differenceBar: {
    height: 12,
    backgroundColor: "#EFEFEF",
    borderRadius: 6,
    overflow: "hidden",
  },
  differenceBarFill: {
    height: "100%",
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
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
    color: "#35343D",
  },
  infoBox: {
    backgroundColor: "#F9F9FC",
    padding: 15,
    borderRadius: 12,
    width: "100%",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#35343D",
    marginBottom: 8,
  },
});
