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
import { useSettings, getThemeColors, scheduleNotification } from "./index";
import translations from "../../assets/translations/textTranslationsIndex";
import screenTranslations from "../../assets/translations/textTranslations";

export default function ImagePickerScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [responseText, setResponseText] = useState(null);
  const [positionScore, setPositionScore] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showWoodTypeButtons, setShowWoodTypeButtons] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Get settings from context
  const { settings } = useSettings();

  // Get translations for current language
  const t = translations[settings.language] || translations.en;

  // Get theme colors
  const colors = getThemeColors(settings.darkMode, settings.highContrast);

  // Get translations for this screen
  const st = screenTranslations[settings.language] || screenTranslations.en;

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
      return Alert.alert(
        st.noImage,
        "Permission for media access not granted."
      );
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
      return Alert.alert(
        st.noImage,
        "Permission for camera access is not granted."
      );
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
    if (score < -0.5)
      return settings.language === "en"
        ? "Very Dark"
        : settings.language === "es"
        ? "Muy Oscuro"
        : settings.language === "fr"
        ? "Très Foncé"
        : settings.language === "de"
        ? "Sehr Dunkel"
        : "非常深";

    if (score < -0.1)
      return settings.language === "en"
        ? "Dark"
        : settings.language === "es"
        ? "Oscuro"
        : settings.language === "fr"
        ? "Foncé"
        : settings.language === "de"
        ? "Dunkel"
        : "深色";

    if (score < 0.1)
      return settings.language === "en"
        ? "Well In Range"
        : settings.language === "es"
        ? "Bien en Rango"
        : settings.language === "fr"
        ? "Bien dans la Gamme"
        : settings.language === "de"
        ? "Gut im Bereich"
        : "在范围内";

    if (score < 0.5)
      return settings.language === "en"
        ? "Light"
        : settings.language === "es"
        ? "Claro"
        : settings.language === "fr"
        ? "Clair"
        : settings.language === "de"
        ? "Hell"
        : "浅色";

    return settings.language === "en"
      ? "Very Light"
      : settings.language === "es"
      ? "Muy Claro"
      : settings.language === "fr"
      ? "Très Clair"
      : settings.language === "de"
      ? "Sehr Hell"
      : "非常浅";
  };

  // Modified analyze function - now shows wood type buttons
  const analyzeImage = () => {
    if (!imageUri || !imageBase64) {
      Alert.alert(st.noImage, st.selectFirst);
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

      // Send notification if enabled
      await scheduleNotification(
        st.analysisNotification,
        st.analysisNotificationBody,
        settings
      );
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
      Alert.alert(st.noImage, st.selectFirst);
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

      const woodType = response.data.wood_type?.classification || st.unknown;
      const summary = `Wood Type: ${woodType}\nConfidence: ${response.data.wood_type?.confidence.toFixed(
        2
      )}%`;

      Alert.alert(st.reportGenerated, summary + "\n\n" + st.seeDetails);

      // Send notification if enabled
      await scheduleNotification(
        st.reportNotification,
        st.reportNotificationBody,
        settings
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
      <View style={dynamicStyles.specializedTestsContainer}>
        <Text style={dynamicStyles.sectionHeader}>{st.woodValidation}</Text>

        {reportData.specialized_tests.binary && (
          <View style={dynamicStyles.testSection}>
            <Text style={dynamicStyles.testHeader}>
              {st.binaryClassification}
            </Text>
            <Text style={dynamicStyles.testResult}>
              {st.result}: {reportData.specialized_tests.binary.predicted_class}
            </Text>
          </View>
        )}

        {reportData.specialized_tests.multiclass && (
          <View style={dynamicStyles.testSection}>
            <Text style={dynamicStyles.testHeader}>
              {st.multiclassClassification}
            </Text>
            <Text style={dynamicStyles.testResult}>
              {st.result}:{" "}
              {reportData.specialized_tests.multiclass.predicted_class}
            </Text>
          </View>
        )}

        {reportData.specialized_tests.regression && (
          <View style={dynamicStyles.testSection}>
            <Text style={dynamicStyles.testHeader}>
              {st.regressionAnalysis}
            </Text>
            <Text style={dynamicStyles.testResult}>
              {st.value}:{" "}
              {reportData.specialized_tests.regression.predicted_value.toFixed(
                4
              )}
            </Text>
          </View>
        )}

        {reportData.specialized_tests.validation && (
          <View style={dynamicStyles.testSection}>
            <Text style={dynamicStyles.testHeader}>
              {st.validationClassification}
            </Text>
            <Text style={dynamicStyles.testResult}>
              {st.result}:{" "}
              {reportData.specialized_tests.validation.predicted_class}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const saveReport = async () => {
    if (!reportData) {
      Alert.alert(st.noImage, st.selectFirst);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "Reports"), {
        Accuracy: reportData.specialized_tests.validation.predicted_class,
        Date: new Date().toISOString(),
        Wood: reportData.wood_type?.classification || st.unknown,
      });
      console.log("Document written with ID: ", docRef.id);
      Alert.alert("Success", st.reportSaved);
    } catch (e) {
      console.error("Error adding document: ", e);
      Alert.alert("Error", st.errorSaving);
    }
  };

  // Create dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: colors.background,
    },
    appTitle: {
      fontSize: 28,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
      marginBottom: 16,
      marginTop: 8,
    },
    instructionText: {
      fontSize: 17,
      color: colors.secondaryText,
      textAlign: "center",
      marginBottom: 32,
      lineHeight: 24,
    },
    startContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      marginTop: 40,
    },
    initialButtonsContainer: {
      width: "100%",
      alignItems: "center",
      gap: 16,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
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
      borderColor: colors.primary,
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    secondaryButtonText: {
      color: colors.primary,
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
      backgroundColor: colors.card,
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
      color: colors.primary,
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
      color: colors.text,
      marginBottom: 8,
    },
    woodTypeButton: {
      backgroundColor: colors.primary,
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
      color: colors.secondaryText,
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
      backgroundColor: colors.primary,
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
      borderColor: colors.border,
      marginTop: 4,
    },
    resetButtonText: {
      color: colors.secondaryText,
      fontSize: 16,
      fontWeight: "500",
    },
    spectrumCard: {
      backgroundColor: colors.card,
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
      color: colors.text,
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
      color: colors.secondaryText,
    },
    spectrumBar: {
      height: 12,
      backgroundColor: colors.darkMode ? "#333333" : "#EFEFEF",
      borderRadius: 6,
      overflow: "hidden",
      position: "relative",
    },
    spectrumFill: {
      height: "100%",
      backgroundColor: colors.primary,
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
      color: colors.text,
      marginTop: 16,
      textAlign: "center",
    },
    confidenceLabel: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 4,
      textAlign: "center",
    },
    responseCard: {
      backgroundColor: colors.card,
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
      color: colors.text,
      marginBottom: 12,
    },
    responseText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    reportContainer: {
      backgroundColor: colors.card,
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
      color: colors.text,
      marginBottom: 20,
      textAlign: "center",
    },
    reportSection: {
      marginBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.darkMode ? "#333333" : "#EFEFEF",
      paddingBottom: 20,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    woodType: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.primary,
      marginBottom: 8,
    },
    confidence: {
      fontSize: 16,
      color: colors.secondaryText,
      marginBottom: 16,
    },
    probabilitiesContainer: {
      marginTop: 16,
    },
    probabilitiesHeader: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
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
      color: colors.secondaryText,
    },
    probabilityValue: {
      width: 60,
      fontSize: 14,
      textAlign: "right",
      color: colors.text,
    },
    probabilityBar: {
      flex: 1,
      height: 8,
      backgroundColor: colors.darkMode ? "#333333" : "#EFEFEF",
      borderRadius: 4,
      marginLeft: 12,
      overflow: "hidden",
    },
    probabilityFill: {
      height: "100%",
      backgroundColor: colors.primary,
    },
    specializedTestsContainer: {
      marginBottom: 24,
    },
    testSection: {
      backgroundColor: colors.darkMode ? "#222222" : "#F9F9FC",
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    testHeader: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    testResult: {
      fontSize: 15,
      color: colors.secondaryText,
    },
    reportActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
      gap: 16,
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.primary,
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

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContainer}>
        <View style={dynamicStyles.container}>
          <Text style={dynamicStyles.appTitle}>{st.appTitle}</Text>

          {!imageUri ? (
            <View style={dynamicStyles.startContainer}>
              <Text style={dynamicStyles.instructionText}>
                {st.instruction}
              </Text>

              <View style={dynamicStyles.initialButtonsContainer}>
                <TouchableOpacity
                  style={dynamicStyles.primaryButton}
                  onPress={pickImage}
                >
                  <Text style={dynamicStyles.buttonText}>
                    {st.chooseGallery}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={dynamicStyles.secondaryButton}
                  onPress={takePicture}
                >
                  <Text style={dynamicStyles.secondaryButtonText}>
                    {st.takePhoto}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={dynamicStyles.analysisContainer}>
              <View style={dynamicStyles.imageFrame}>
                <Image source={{ uri: imageUri }} style={dynamicStyles.image} />
              </View>

              {/* Loading indicators */}
              {isLoading && (
                <View style={dynamicStyles.loaderContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={dynamicStyles.loaderText}>{st.analyzing}</Text>
                </View>
              )}

              {isGeneratingReport && (
                <View style={dynamicStyles.loaderContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={dynamicStyles.loaderText}>
                    {st.generatingReport}
                  </Text>
                </View>
              )}

              {/* Wood Type Selection Buttons */}
              {showWoodTypeButtons && !isLoading && (
                <View style={dynamicStyles.woodTypeButtonsContainer}>
                  <Text style={dynamicStyles.woodTypePrompt}>
                    {st.selectWoodPrompt}
                  </Text>

                  <TouchableOpacity
                    style={dynamicStyles.woodTypeButton}
                    onPress={() => analyzeByWoodType("Medium Cherry")}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {st.mediumCherry}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.woodTypeButton}
                    onPress={() => analyzeByWoodType("Desert Oak")}
                  >
                    <Text style={dynamicStyles.buttonText}>{st.desertOak}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.woodTypeButton}
                    onPress={() => analyzeByWoodType("Graphite Walnut")}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {st.graphiteWalnut}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.cancelButton}
                    onPress={() => setShowWoodTypeButtons(false)}
                  >
                    <Text style={dynamicStyles.cancelButtonText}>
                      {st.cancel}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Buttons */}
              {!isLoading && !isGeneratingReport && !showWoodTypeButtons && (
                <View style={dynamicStyles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={dynamicStyles.actionButton}
                    onPress={analyzeImage}
                  >
                    <Text style={dynamicStyles.buttonText}>{st.analyze}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.actionButton}
                    onPress={generateFullReport}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {st.generateReport}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.resetButton}
                    onPress={reuploadImage}
                  >
                    <Text style={dynamicStyles.resetButtonText}>
                      {st.newImage}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Spectrum Bar */}
              {positionScore !== null && (
                <View style={dynamicStyles.spectrumCard}>
                  <Text style={dynamicStyles.spectrumTitle}>
                    {st.colorAnalysis}
                  </Text>

                  <View style={dynamicStyles.spectrumContainer}>
                    <View style={dynamicStyles.spectrumLabels}>
                      <Text style={dynamicStyles.spectrumLabel}>{st.dark}</Text>
                      <Text style={dynamicStyles.spectrumLabel}>
                        {st.light}
                      </Text>
                    </View>

                    <View style={dynamicStyles.spectrumBar}>
                      <View
                        style={[
                          dynamicStyles.spectrumFill,
                          { width: `${((positionScore + 1) / 2) * 100}%` },
                        ]}
                      />
                      <View
                        style={[
                          dynamicStyles.spectrumMarker,
                          { left: `${((positionScore + 1) / 2) * 100}%` },
                        ]}
                      />
                    </View>

                    <Text style={dynamicStyles.positionLabel}>
                      {st.analysis}: {getPositionLabel(positionScore)} (
                      {positionScore.toFixed(2)})
                    </Text>
                    <Text style={dynamicStyles.confidenceLabel}>
                      {st.confidence}: {confidence?.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              )}

              {/* Response Text */}
              {responseText && (
                <View style={dynamicStyles.responseCard}>
                  <Text style={dynamicStyles.responseTitle}>
                    {st.analysisResults}
                  </Text>
                  <Text style={dynamicStyles.responseText}>{responseText}</Text>
                </View>
              )}

              {/* Full Report Results */}
              {reportData && (
                <View style={dynamicStyles.reportContainer}>
                  <Text style={dynamicStyles.reportTitle}>
                    {st.reportTitle}
                  </Text>

                  <View style={dynamicStyles.reportSection}>
                    <Text style={dynamicStyles.sectionHeader}>
                      {st.woodClassification}
                    </Text>
                    <Text style={dynamicStyles.woodType}>
                      {reportData.wood_type?.classification || st.unknown}
                    </Text>
                    <Text style={dynamicStyles.confidence}>
                      {st.confidence}:{" "}
                      {reportData.wood_type?.confidence.toFixed(2)}%
                    </Text>

                    {/* Probability distribution */}
                    {reportData.wood_type?.all_probabilities && (
                      <View style={dynamicStyles.probabilitiesContainer}>
                        <Text style={dynamicStyles.probabilitiesHeader}>
                          {st.allProbabilities}
                        </Text>
                        {Object.entries(
                          reportData.wood_type.all_probabilities
                        ).map(([key, value]) => (
                          <View key={key} style={dynamicStyles.probabilityRow}>
                            <Text style={dynamicStyles.probabilityName}>
                              {key}
                            </Text>
                            <Text style={dynamicStyles.probabilityValue}>
                              {value.toFixed(2)}%
                            </Text>
                            <View style={dynamicStyles.probabilityBar}>
                              <View
                                style={[
                                  dynamicStyles.probabilityFill,
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

                  <View style={dynamicStyles.reportActions}>
                    <TouchableOpacity
                      style={dynamicStyles.saveButton}
                      onPress={saveReport}
                    >
                      <Text style={dynamicStyles.buttonText}>
                        {st.saveReport}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={dynamicStyles.shareButton}
                      onPress={() => Linking.openURL(mailtoLink)}
                    >
                      <Text style={dynamicStyles.buttonText}>
                        {st.shareResults}
                      </Text>
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
