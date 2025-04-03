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
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BACKEND_URLS } from "../../config"; // Import from config
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [positionScore, setPositionScore] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  const [reportData, setReportData] = useState<any>(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState<
    boolean | null
  >(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
<<<<<<< HEAD
  // New state to control showing wood type selection buttons
  const [showWoodTypeButtons, setShowWoodTypeButtons] =
    useState<boolean>(false);

  const subject = "Check this out!";
  const body = "Hey, I wanted to share this with you.\n\nBest regards!";
  const mailtoLink = `mailto:?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
=======


  // Now using BACKEND_URLS from config instead of hardcoded values
>>>>>>> origin/main

  useEffect(() => {
    (async () => {
      const galleryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      // Reset previous results
      setReportData(null);
      setResponseText(null);
      setPositionScore(null);
      setConfidence(null);
      setShowWoodTypeButtons(false); // Hide wood type buttons when new image is selected
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
      // Reset previous results
      setReportData(null);
      setResponseText(null);
      setPositionScore(null);
      setConfidence(null);
      setShowWoodTypeButtons(false); // Hide wood type buttons when new image is selected
    }
  };

  // Helper: Get a label based on the regression score
  const getPositionLabel = (score: number): string => {
    if (score < -0.5) return "Very Dark";
    if (score < -0.1) return "Dark";
    if (score < 0.1) return "Well In Range";
    if (score < 0.5) return "Light";
    return "Very Light";
  };

  // Modified analyze function - now shows wood type buttons instead of directly calling endpoints
  const analyzeImage = () => {
    if (!imageUri || !imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    // Show the wood type selection buttons
    setShowWoodTypeButtons(true);
    // Clear any previous results
    setResponseText(null);
    setPositionScore(null);
    setConfidence(null);
  };

  // New function to handle wood type selection and call respective endpoint
  const analyzeByWoodType = async (woodType: string) => {
    setIsLoading(true);
    try {
      let endpointUrl: string;

      // Determine which endpoint to call based on selected wood type
      switch (woodType) {
        case "Medium Cherry":
          endpointUrl = BACKEND_URLS.medium_cherry;
          break;
        case "Desert Oak":
          endpointUrl = BACKEND_URLS.desert_oak;
          break;
        case "Graphite Walnut":
          endpointUrl = BACKEND_URLS.graphite_walnut;
          break;
        default:
          throw new Error(`Unknown wood type: ${woodType}`);
      }

      // Call the appropriate endpoint
      const response = await axios.post(
        endpointUrl,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );

      // Process the response
      const result = response.data?.result;
      const isInRange = result === true;

      // Set position score for visualization (optional)
      if (response.data?.position_score !== undefined) {
        setPositionScore(response.data.position_score);
        setConfidence(response.data.confidence || 95); // Default to 95 if not provided
      }

      // Display the result
      const resultText = `Wood Type: ${woodType}\nResult: ${
        isInRange ? "In Range" : "Out of Range"
      }`;
      setResponseText(resultText);
      Alert.alert("Analysis Result", resultText);

      // Hide the wood type buttons after analysis
      setShowWoodTypeButtons(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Analyze Error:", error.response?.data || error.message);
        Alert.alert(
          "Error",
          `Failed to analyze image: ${
            error.response?.data?.error || error.message
          }`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Full Report
  const generateFullReport = async () => {
    if (!imageUri || !imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    setIsGeneratingReport(true);
    try {
      // Call the full report endpoint
      const response = await axios.post(
        BACKEND_URLS.generateFullReport ||
          `${BACKEND_URLS.baseUrl}/generate-full-report`,
        {
          image: imageBase64,
          mimeType: "image/jpeg",
          colorSpace: "lab", // Using LAB color space for better wood color detection
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (!response.data || response.data.error) {
        Alert.alert(
          "Error",
          `Failed to generate report: ${
            response.data?.error || "Unknown error"
          }`
        );
        return;
      }

      // Store the full report data
      setReportData(response.data);

      // Build a simple summary for the alert
      const woodType = response.data.wood_type?.classification || "Unknown";
      const summary = `Wood Type: ${woodType}\nConfidence: ${response.data.wood_type?.confidence.toFixed(
        2
      )}%`;

      // Show a brief alert with the main finding
      Alert.alert(
        "Report Generated",
        summary + "\n\nSee below for full details"
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Report Error:", error.response?.data || error.message);
        Alert.alert(
          "Error",
          `Failed to generate report: ${
            error.response?.data?.error || error.message
          }`
        );
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Reupload: resets image and response state
  const reuploadImage = () => {
    setImageUri(null);
    setImageBase64(null);
    setResponseText(null);
    setPositionScore(null);
    setConfidence(null);
    setReportData(null);
    setShowWoodTypeButtons(false); // Hide wood type buttons
  };

  // Format specialized test results for display
  const renderSpecializedTests = () => {
    if (
      !reportData?.specialized_tests ||
      Object.keys(reportData.specialized_tests).length === 0
    ) {
      return null;
    }

    return (
      <View style={styles.specializedTestsContainer}>
        <Text style={styles.sectionHeader}>Specialized Tests</Text>

        {reportData.specialized_tests.binary && (
          <View style={styles.testSection}>
            <Text style={styles.testHeader}>Binary Classification</Text>
            <Text>
              Result: {reportData.specialized_tests.binary.predicted_class}
            </Text>
            <Text>
              Confidence:{" "}
              {reportData.specialized_tests.binary.confidence.toFixed(2)}%
            </Text>
          </View>
        )}

        {reportData.specialized_tests.multiclass && (
          <View style={styles.testSection}>
            <Text style={styles.testHeader}>Multiclass Classification</Text>
            <Text>
              Result: {reportData.specialized_tests.multiclass.predicted_class}
            </Text>
            <Text>
              Confidence:{" "}
              {reportData.specialized_tests.multiclass.confidence.toFixed(2)}%
            </Text>
          </View>
        )}

        {reportData.specialized_tests.regression && (
          <View style={styles.testSection}>
            <Text style={styles.testHeader}>Regression Analysis</Text>
            <Text>
              Value:{" "}
              {reportData.specialized_tests.regression.predicted_value.toFixed(
                4
              )}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const saveReport = async () => {
    if (!reportData) {
      Alert.alert("No report available", "Please generate a report first.");
      return;
    }

    // Store the report in your preferred storage (e.g., Firebase, local storage)
    try {
      // Save the report to Firebase Firestore
      const docRef = await addDoc(collection(db, "Reports"), {
        Accuracy: reportData.wood_type?.confidence,
        Date: new Date().toISOString(),
        Wood: reportData.wood_type?.classification || "Unknown",
      });
      console.log("Document written with ID: ", docRef.id);
      alert("Report saved successfully!");
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Error saving report.");
    }
  };

<<<<<<< HEAD
  const title = "Wood Report Details";
  const content = `This is a detailed report of your wood analysis. The results are based on the image you provided. The analysis includes the classification of the wood type, confidence levels, and any specialized tests that were performed. Please review the results carefully and let us know if you have any questions or need further assistance. Report Summary: - Wood Type: ${
    reportData?.wood_type?.classification ?? "Unknown"
  } - Accuracy: ${
    reportData?.wood_type?.confidence ?? 0
  }% - Date: ${new Date().toISOString()} - Specialized Tests: ${
    reportData?.specialized_tests ? "Available" : "Not Available"
  } - Color Space: ${reportData?.color_space_used ?? "Not Specified"}`;
  const mail = `mailto:${""}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
=======
>>>>>>> origin/main
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Show image selection buttons only if no image has been picked */}
        {!imageUri && (
          <>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={pickImage}>
                <Text style={styles.buttonText}>Select Image</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={takePicture}>
                <Text style={styles.buttonText}>Take Picture</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

        {imageUri && (
          <>
            {/* Loading indicators */}
            {isLoading && (
              <ActivityIndicator
                size="large"
                color="#0000ff"
                style={styles.loader}
              />
            )}

            {isGeneratingReport && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#ff9800" />
                <Text style={styles.loaderText}>Generating full report...</Text>
              </View>
            )}

            {/* Wood Type Selection Buttons - Only show after Analyze is clicked */}
            {showWoodTypeButtons && !isLoading && (
              <View style={styles.woodTypeButtonsContainer}>
                <Text style={styles.woodTypePrompt}>Select wood type:</Text>
                <TouchableOpacity
                  style={[styles.button, styles.woodTypeButton]}
                  onPress={() => analyzeByWoodType("Medium Cherry")}
                >
                  <Text style={styles.buttonText}>Medium Cherry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.woodTypeButton]}
                  onPress={() => analyzeByWoodType("Desert Oak")}
                >
                  <Text style={styles.buttonText}>Desert Oak</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.woodTypeButton]}
                  onPress={() => analyzeByWoodType("Graphite Walnut")}
                >
                  <Text style={styles.buttonText}>Graphite Walnut</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons */}
            {!isLoading && !isGeneratingReport && !showWoodTypeButtons && (
              <View style={styles.buttonRow}>
                <View style={styles.flexButton}>
                  <TouchableOpacity
                    style={[styles.button, styles.analyzeButton]}
                    onPress={analyzeImage}
                  >
                    <Text style={styles.buttonText}>Analyze</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.flexButton}>
                  <TouchableOpacity
                    style={[styles.button, styles.fullReportButton]}
                    onPress={generateFullReport}
                  >
                    <Text style={styles.buttonText}>Full Report</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.flexButton}>
                  <TouchableOpacity
                    style={[styles.button, styles.reuploadButton]}
                    onPress={reuploadImage}
                  >
                    <Text style={styles.buttonText}>Reupload</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Spectrum Bar: shows position and confidence if regression was run */}
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

        {/* Response Text from original analysis */}
        {responseText && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseText}>{responseText}</Text>
          </View>
        )}

        {/* Full Report Results */}
        {reportData && (
          <View style={styles.reportContainer}>
            <Text style={styles.reportTitle}>Full Analysis Report</Text>

            <View style={styles.woodTypeContainer}>
              <Text style={styles.sectionHeader}>Wood Classification</Text>
              <Text style={styles.woodType}>
                {reportData.wood_type?.classification || "Unknown"}
              </Text>
              <Text style={styles.confidence}>
                Confidence: {reportData.wood_type?.confidence.toFixed(2)}%
              </Text>

              {/* Probability distribution */}
              {reportData.wood_type?.all_probabilities && (
                <View style={styles.probabilitiesContainer}>
                  <Text style={styles.probabilitiesHeader}>
                    All Probabilities:
                  </Text>
                  {Object.entries(reportData.wood_type.all_probabilities).map(
                    ([key, value]) => (
                      <View key={key} style={styles.probabilityRow}>
                        <Text style={styles.probabilityName}>{key}:</Text>
                        <Text style={styles.probabilityValue}>
                          {(value as number).toFixed(2)}%
                        </Text>
                        <View style={styles.probabilityBar}>
                          <View
                            style={[
                              styles.probabilityFill,
                              { width: `${value as number}%` },
                            ]}
                          />
                        </View>
                      </View>
                    )
                  )}
                </View>
              )}
            </View>

            {/* Specialized Tests */}
            {renderSpecializedTests()}

            {/* Color Space Info */}
            <Text style={styles.colorSpaceInfo}>
              Color space: {reportData.color_space_used || "rgb"}
            </Text>
<<<<<<< HEAD
            <button onClick={() => (window.location.href = mailtoLink)}>
              Share via Email
            </button>
=======
>>>>>>> origin/main
            <button onClick={saveReport}>Save Report</button>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
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
  button: {
    backgroundColor: "#2196F3", // Your exact blue color
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 10,
    flexWrap: "wrap",
  },
  flexButton: {
    marginHorizontal: 5,
    minWidth: 110,
    marginBottom: 10,
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
  loaderContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: "#ff9800",
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
  // Report styles
  reportContainer: {
    marginTop: 25,
    width: "100%",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 15,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#333",
  },
  woodTypeContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  woodType: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4a90e2",
    marginBottom: 5,
  },
  confidence: {
    fontSize: 16,
    marginBottom: 10,
  },
  probabilitiesContainer: {
    marginTop: 10,
  },
  probabilitiesHeader: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  probabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  probabilityName: {
    width: 120,
    fontSize: 14,
  },
  probabilityValue: {
    width: 60,
    fontSize: 14,
    textAlign: "right",
  },
  probabilityBar: {
    flex: 1,
    height: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
    marginLeft: 10,
    overflow: "hidden",
  },
  probabilityFill: {
    height: "100%",
    backgroundColor: "#4a90e2",
  },
  specializedTestsContainer: {
    marginBottom: 15,
  },
  testSection: {
    backgroundColor: "#e8eaf6",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  testHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#3f51b5",
  },
  colorSpaceInfo: {
    marginTop: 10,
    fontSize: 14,
    fontStyle: "italic",
    color: "#757575",
    textAlign: "right",
  },
  analyzeButton: {
    backgroundColor: "#2196F3",
  },
  fullReportButton: {
    backgroundColor: "#ff9800",
  },
  reuploadButton: {
    backgroundColor: "#f44336",
  },
  // New styles for wood type buttons
  woodTypeButtonsContainer: {
    marginTop: 15,
    alignItems: "center",
    width: "100%",
  },
  woodTypePrompt: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  woodTypeButton: {
    marginVertical: 8,
    width: "80%",
    backgroundColor: "#4CAF50", // Green color for wood type buttons
  },
});
