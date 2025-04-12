import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  Alert,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BACKEND_URLS } from "../../config";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [responseText, setResponseText] = useState(null);
  const [positionScore, setPositionScore] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [showWoodTypeButtons, setShowWoodTypeButtons] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const subject = "Check this out!";
  const body = "Hey, I wanted to share this with you.\n\nBest regards!";
  const mailtoLink = `mailto:?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

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
      setShowWoodTypeButtons(false);
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
      setShowWoodTypeButtons(false);
    }
  };

  // Helper: Get a label based on the regression score
  const getPositionLabel = (score) => {
    if (score < -0.5) return "Very Dark";
    if (score < -0.1) return "Dark";
    if (score < 0.1) return "Well In Range";
    if (score < 0.5) return "Light";
    return "Very Light";
  };

  // Modified analyze function - now shows wood type buttons
  const analyzeImage = () => {
    if (!imageUri || !imageBase64) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    setShowWoodTypeButtons(true);
    setResponseText(null);
    setPositionScore(null);
    setConfidence(null);
    setReportData(null);
  };

  // New function to handle wood type selection and call both endpoints
  const analyzeByWoodType = async (woodType) => {
    setIsLoading(true);
    try {
      let endpointUrl;
      let rgbWoodType;

      switch (woodType) {
        case "Medium Cherry":
          endpointUrl = BACKEND_URLS.medium_cherry;
          rgbWoodType = "medium-cherry";
          break;
        case "Desert Oak":
          endpointUrl = BACKEND_URLS.desert_oak;
          rgbWoodType = "desert-oak";
          break;
        case "Graphite Walnut":
          endpointUrl = BACKEND_URLS.graphite_walnut;
          rgbWoodType = "graphite-walnut";
          break;
        default:
          throw new Error(`Unknown wood type: ${woodType}`);
      }

      // Call the original endpoint
      const originalResponse = await axios.post(
        endpointUrl,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );

      const result = originalResponse.data?.result;
      const isInRange = result === true;

      if (originalResponse.data?.position_score !== undefined) {
        setPositionScore(originalResponse.data.position_score);
        setConfidence(originalResponse.data.confidence || 95);
      }

      // Call the RGB classification endpoint
      const rgbResponse = await axios.post(
        BACKEND_URLS.classify_wood,
        {
          image: imageBase64,
          color: rgbWoodType,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const rgbResults = rgbResponse.data;
      const predictedCategory = rgbResults.predicted_category;
      const mainCategory = rgbResults.main_category;

      const resultText = `Wood Type: ${woodType}
      RGB Analysis:
      Category: ${predictedCategory}
      Result: ${mainCategory === "in-range" ? "In Range" : "Out of Range"}
      `;

      setResponseText(resultText);
      Alert.alert("Analysis Result", resultText);
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
      const response = await axios.post(
        BACKEND_URLS.generateFullReport ||
          `${BACKEND_URLS.baseUrl}/generate-full-report`,
        {
          image: imageBase64,
          mimeType: "image/jpeg",
          colorSpace: "lab",
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

      setReportData(response.data);

      const woodType = response.data.wood_type?.classification || "Unknown";
      const summary = `Wood Type: ${woodType}\nConfidence: ${response.data.wood_type?.confidence.toFixed(
        2
      )}%`;

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
    setShowWoodTypeButtons(false);
  };

  // Render specialized tests results for display
  const renderSpecializedTests = () => {
    if (
      !reportData?.specialized_tests ||
      Object.keys(reportData.specialized_tests).length === 0
    ) {
      return null;
    }

    return (
      <View style={styles.specializedTestsContainer}>
        <Text style={styles.sectionHeader}>Wood Validation</Text>

        {reportData.specialized_tests.binary && (
          <View style={styles.testSection}>
            <Text style={styles.testHeader}>Binary Classification</Text>
            <Text style={styles.testResult}>
              Result: {reportData.specialized_tests.binary.predicted_class}
            </Text>
          </View>
        )}

        {reportData.specialized_tests.multiclass && (
          <View style={styles.testSection}>
            <Text style={styles.testHeader}>Multiclass Classification</Text>
            <Text style={styles.testResult}>
              Result: {reportData.specialized_tests.multiclass.predicted_class}
            </Text>
          </View>
        )}

        {reportData.specialized_tests.regression && (
          <View style={styles.testSection}>
            <Text style={styles.testHeader}>Regression Analysis</Text>
            <Text style={styles.testResult}>
              Value:{" "}
              {reportData.specialized_tests.regression.predicted_value.toFixed(
                4
              )}
            </Text>
          </View>
        )}

        {reportData.specialized_tests.validation && (
          <View style={styles.testSection}>
            <Text style={styles.testHeader}>Validation Classification</Text>
            <Text style={styles.testResult}>
              Result: {reportData.specialized_tests.validation.predicted_class}
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

    try {
      const docRef = await addDoc(collection(db, "Reports"), {
        Accuracy: reportData.wood_type?.confidence,
        Date: new Date().toISOString(),
        Wood: reportData.wood_type?.classification || "Unknown",
      });
      console.log("Document written with ID: ", docRef.id);
      Alert.alert("Success", "Report saved successfully!");
    } catch (e) {
      console.error("Error adding document: ", e);
      Alert.alert("Error", "Failed to save report.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.appTitle}>Wood Analysis Assistant</Text>

          {!imageUri ? (
            <View style={styles.startContainer}>
              <Text style={styles.instructionText}>
                Upload or take a photo of wood to analyze its type and
                properties
              </Text>

              <View style={styles.initialButtonsContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={pickImage}
                >
                  <Text style={styles.buttonText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={takePicture}
                >
                  <Text style={styles.secondaryButtonText}>Take a Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.analysisContainer}>
              <View style={styles.imageFrame}>
                <Image source={{ uri: imageUri }} style={styles.image} />
              </View>

              {/* Loading indicators */}
              {isLoading && (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#8A3FFC" />
                  <Text style={styles.loaderText}>Analyzing wood type...</Text>
                </View>
              )}

              {isGeneratingReport && (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#8A3FFC" />
                  <Text style={styles.loaderText}>
                    Generating comprehensive report...
                  </Text>
                </View>
              )}

              {/* Wood Type Selection Buttons */}
              {showWoodTypeButtons && !isLoading && (
                <View style={styles.woodTypeButtonsContainer}>
                  <Text style={styles.woodTypePrompt}>
                    Select wood type for analysis:
                  </Text>

                  <TouchableOpacity
                    style={styles.woodTypeButton}
                    onPress={() => analyzeByWoodType("Medium Cherry")}
                  >
                    <Text style={styles.buttonText}>Medium Cherry</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.woodTypeButton}
                    onPress={() => analyzeByWoodType("Desert Oak")}
                  >
                    <Text style={styles.buttonText}>Desert Oak</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.woodTypeButton}
                    onPress={() => analyzeByWoodType("Graphite Walnut")}
                  >
                    <Text style={styles.buttonText}>Graphite Walnut</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowWoodTypeButtons(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Buttons */}
              {!isLoading && !isGeneratingReport && !showWoodTypeButtons && (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={analyzeImage}
                  >
                    <Text style={styles.buttonText}>Analyze</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={generateFullReport}
                  >
                    <Text style={styles.buttonText}>Generate Report</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={reuploadImage}
                  >
                    <Text style={styles.resetButtonText}>New Image</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Spectrum Bar */}
              {positionScore !== null && (
                <View style={styles.spectrumCard}>
                  <Text style={styles.spectrumTitle}>Color Analysis</Text>

                  <View style={styles.spectrumContainer}>
                    <View style={styles.spectrumLabels}>
                      <Text style={styles.spectrumLabel}>Dark</Text>
                      <Text style={styles.spectrumLabel}>Light</Text>
                    </View>

                    <View style={styles.spectrumBar}>
                      <View
                        style={[
                          styles.spectrumFill,
                          { width: `${((positionScore + 1) / 2) * 100}%` },
                        ]}
                      />
                      <View
                        style={[
                          styles.spectrumMarker,
                          { left: `${((positionScore + 1) / 2) * 100}%` },
                        ]}
                      />
                    </View>

                    <Text style={styles.positionLabel}>
                      Analysis: {getPositionLabel(positionScore)} (
                      {positionScore.toFixed(2)})
                    </Text>
                    <Text style={styles.confidenceLabel}>
                      Confidence: {confidence?.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              )}

              {/* Response Text */}
              {responseText && (
                <View style={styles.responseCard}>
                  <Text style={styles.responseTitle}>Analysis Results</Text>
                  <Text style={styles.responseText}>{responseText}</Text>
                </View>
              )}

              {/* Full Report Results */}
              {reportData && (
                <View style={styles.reportContainer}>
                  <Text style={styles.reportTitle}>Comprehensive Analysis</Text>

                  <View style={styles.reportSection}>
                    <Text style={styles.sectionHeader}>
                      Wood Classification
                    </Text>
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
                        {Object.entries(
                          reportData.wood_type.all_probabilities
                        ).map(([key, value]) => (
                          <View key={key} style={styles.probabilityRow}>
                            <Text style={styles.probabilityName}>{key}</Text>
                            <Text style={styles.probabilityValue}>
                              {value.toFixed(2)}%
                            </Text>
                            <View style={styles.probabilityBar}>
                              <View
                                style={[
                                  styles.probabilityFill,
                                  { width: `${value}%` },
                                ]}
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {renderSpecializedTests()}

                  <View style={styles.reportActions}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={saveReport}
                    >
                      <Text style={styles.buttonText}>Save Report</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => Linking.openURL(mailtoLink)}
                    >
                      <Text style={styles.buttonText}>Share Results</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
  startContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginTop: 40,
  },
  instructionText: {
    fontSize: 17,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  initialButtonsContainer: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#8A3FFC", // Claude's purple
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
  loaderContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8A3FFC",
  },
  woodTypeButtonsContainer: {
    width: "100%",
    marginVertical: 16,
    alignItems: "center",
    gap: 12,
  },
  woodTypePrompt: {
    fontSize: 18,
    fontWeight: "500",
    color: "#35343D",
    marginBottom: 8,
  },
  woodTypeButton: {
    backgroundColor: "#8A3FFC",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
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
  resetButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  spectrumCard: {
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
  spectrumTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#35343D",
    marginBottom: 16,
  },
  spectrumContainer: {
    width: "100%",
  },
  spectrumLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  spectrumLabel: {
    fontSize: 14,
    color: "#666",
  },
  spectrumBar: {
    height: 12,
    backgroundColor: "#EFEFEF",
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
  },
  spectrumFill: {
    height: "100%",
    backgroundColor: "#8A3FFC",
    borderRadius: 6,
  },
  spectrumMarker: {
    position: "absolute",
    top: -4,
    marginLeft: -6,
    width: 12,
    height: 20,
    backgroundColor: "#5E35B1",
    borderRadius: 6,
  },
  positionLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#35343D",
    marginTop: 16,
    textAlign: "center",
  },
  confidenceLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
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
    marginBottom: 12,
  },
  responseText: {
    fontSize: 16,
    color: "#35343D",
    lineHeight: 24,
  },
  reportContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#35343D",
    marginBottom: 20,
    textAlign: "center",
  },
  reportSection: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#35343D",
    marginBottom: 12,
  },
  woodType: {
    fontSize: 24,
    fontWeight: "700",
    color: "#8A3FFC",
    marginBottom: 8,
  },
  confidence: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  probabilitiesContainer: {
    marginTop: 16,
  },
  probabilitiesHeader: {
    fontSize: 16,
    fontWeight: "500",
    color: "#35343D",
    marginBottom: 12,
  },
  probabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  probabilityName: {
    width: 120,
    fontSize: 14,
    color: "#666",
  },
  probabilityValue: {
    width: 60,
    fontSize: 14,
    textAlign: "right",
    color: "#35343D",
  },
  probabilityBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#EFEFEF",
    borderRadius: 4,
    marginLeft: 12,
    overflow: "hidden",
  },
  probabilityFill: {
    height: "100%",
    backgroundColor: "#8A3FFC",
  },
  specializedTestsContainer: {
    marginBottom: 24,
  },
  testSection: {
    backgroundColor: "#F9F9FC",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  testHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#35343D",
    marginBottom: 8,
  },
  testResult: {
    fontSize: 15,
    color: "#666",
  },
  reportActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#8A3FFC",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  shareButton: {
    flex: 1,
    backgroundColor: "#5E35B1",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
});
