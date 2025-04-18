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
  Platform,
  LogBox,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { BACKEND_URLS } from "../../config";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useSettings, getThemeColors, scheduleNotification } from "./index";
import translations from "../../assets/translations/textTranslationsIndex";
import screenTranslations from "../../assets/translations/textTranslations";

// Setup global error handling and logging
const logError = (component, functionName, error) => {
  const errorMessage = `ERROR in ${component}.${functionName}: ${
    error.message || error
  }`;
  console.error(errorMessage);
  if (error.stack) {
    console.error(error.stack);
  }
  return errorMessage;
};

const logInfo = (component, functionName, message) => {
  const logMessage = `INFO: ${component}.${functionName}: ${message}`;
  console.log(logMessage);
  return logMessage;
};

// Ignore specific warnings that might be irrelevant
LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
]);

export default function ImagePickerScreen() {
  // Debug identifier
  const COMPONENT_NAME = "ImagePickerScreen";

  // State variables
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
  const [woodSelectionMode, setWoodSelectionMode] = useState(null); // 'analyze' or 'report'
  const [showReport, setShowReport] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [lastError, setLastError] = useState(null);

  // Get settings from context
  const { settings } = useSettings();

  // Get translations for current language
  const t = translations[settings.language] || translations.en;

  // Get theme colors
  let colors;
  try {
    colors = getThemeColors(settings.darkMode, settings.highContrast);
  } catch (error) {
    logError(COMPONENT_NAME, "getThemeColors", error);
    // Fallback colors
    colors = {
      background: "#FFFFFF",
      text: "#000000",
      primary: "#6200EE",
      secondary: "#03DAC6",
      card: "#F5F5F5",
      border: "#E0E0E0",
      secondaryText: "#666666",
    };
  }

  // Get translations for this screen
  let st;
  try {
    st = screenTranslations[settings.language] || screenTranslations.en;
    logInfo(
      COMPONENT_NAME,
      "init",
      `Loaded translations for language: ${settings.language}`
    );
  } catch (error) {
    logError(COMPONENT_NAME, "loadTranslations", error);
    // Fallback translations
    st = {
      appTitle: "Wood Analyzer",
      instruction: "Take a photo or choose from gallery to analyze wood color",
      chooseGallery: "Choose from Gallery",
      takePhoto: "Take a Photo",
      noImage: "No Image",
      selectFirst: "Please select an image first",
      analyzing: "Analyzing...",
      generatingReport: "Generating Report...",
      selectWoodPrompt: "Select wood type:",
      mediumCherry: "Medium Cherry",
      desertOak: "Desert Oak",
      graphiteWalnut: "Graphite Walnut",
      cancel: "Cancel",
      analyze: "Analyze",
      generateReport: "Generate Report",
      newImage: "New Image",
      reportTitle: "Wood Analysis Report",
      woodClassification: "Wood Classification",
      colorAnalysis: "Color Analysis",
      tooDark: "Too Dark",
      tooLight: "Too Light",
      inRange: "In Range",
      outOfRange: "Out of Range",
      analysisResults: "Analysis Results",
      category: "Category",
      categorySimilarity: "Category Similarity",
      inRangeDark: "Dark (In Range)",
      inRangeLight: "Light (In Range)",
      inRangeStandard: "Standard (In Range)",
      outOfRangeTooDark: "Too Dark (Out of Range)",
      outOfRangeTooLight: "Too Light (Out of Range)",
      analysis: "Analysis",
      saveReport: "Save Report",
      shareResults: "Share",
      selectWoodType: "Select Wood Type",
      selectWoodTypeMsg: "Please select the wood type you want to analyze",
      unknown: "Unknown",
      reportGenerated: "Report Generated",
      seeDetails: "See details below.",
      reportSaved: "Report saved successfully",
      errorSaving: "Error saving report",
    };
  }

  const subject = "Check this out!";
  const body = "Hey, I wanted to share this with you.\n\nBest regards!";
  const mailtoLink = `mailto:?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  useEffect(() => {
    logInfo(
      COMPONENT_NAME,
      "useEffect",
      "Component mounted - requesting permissions"
    );

    const requestPermissions = async () => {
      try {
        const galleryStatus =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        logInfo(
          COMPONENT_NAME,
          "requestPermissions",
          `Gallery permission status: ${galleryStatus.status}`
        );
        setHasGalleryPermission(galleryStatus.status === "granted");

        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        logInfo(
          COMPONENT_NAME,
          "requestPermissions",
          `Camera permission status: ${cameraStatus.status}`
        );
        setHasCameraPermission(cameraStatus.status === "granted");
      } catch (error) {
        const errorMsg = logError(COMPONENT_NAME, "requestPermissions", error);
        setLastError(errorMsg);
        Alert.alert(
          "Permission Error",
          "There was an error requesting camera or gallery permissions."
        );
      }
    };

    requestPermissions();
  }, []);

  // Pick image from gallery
  const pickImage = async () => {
    try {
      logInfo(COMPONENT_NAME, "pickImage", "Picking image from gallery");

      if (hasGalleryPermission === false) {
        logInfo(COMPONENT_NAME, "pickImage", "Gallery permission denied");
        return Alert.alert(
          st.noImage,
          "Permission for media access not granted."
        );
      }

      const pickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: true,
      };

      logInfo(
        COMPONENT_NAME,
        "pickImage",
        "Launching image picker with options: " + JSON.stringify(pickerOptions)
      );
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      logInfo(
        COMPONENT_NAME,
        "pickImage",
        "Picker result - canceled: " + result.canceled
      );

      if (!result.canceled && result.assets && result.assets.length > 0) {
        logInfo(COMPONENT_NAME, "pickImage", "Image selected successfully");

        // Check image size before setting
        if (result.assets[0].base64) {
          const base64Size = (result.assets[0].base64.length * 3) / 4;
          logInfo(
            COMPONENT_NAME,
            "pickImage",
            `Base64 image size: ${(base64Size / 1024 / 1024).toFixed(2)} MB`
          );

          if (base64Size > 10 * 1024 * 1024) {
            Alert.alert(
              "Image Too Large",
              "The selected image is too large. Please select a smaller image."
            );
            return;
          }
        }

        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || null);

        // Reset previous results
        setReportData(null);
        setResponseText(null);
        setPositionScore(null);
        setConfidence(null);
        setAnalysisData(null);
        setShowWoodTypeButtons(false);
        setLastError(null);
      } else {
        logInfo(
          COMPONENT_NAME,
          "pickImage",
          "Image selection canceled or no image selected"
        );
      }
    } catch (error) {
      const errorMsg = logError(COMPONENT_NAME, "pickImage", error);
      setLastError(errorMsg);
      Alert.alert(
        "Gallery Error",
        "There was an error selecting an image: " + error.message
      );
    }
  };

  // Take picture with camera
  const takePicture = async () => {
    try {
      logInfo(COMPONENT_NAME, "takePicture", "Taking picture with camera");

      if (hasCameraPermission === false) {
        logInfo(COMPONENT_NAME, "takePicture", "Camera permission denied");
        return Alert.alert(
          st.noImage,
          "Permission for camera access is not granted."
        );
      }

      const cameraOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: true,
      };

      logInfo(
        COMPONENT_NAME,
        "takePicture",
        "Launching camera with options: " + JSON.stringify(cameraOptions)
      );
      const result = await ImagePicker.launchCameraAsync(cameraOptions);

      logInfo(
        COMPONENT_NAME,
        "takePicture",
        "Camera result - canceled: " + result.canceled
      );

      if (!result.canceled && result.assets && result.assets.length > 0) {
        logInfo(COMPONENT_NAME, "takePicture", "Picture taken successfully");
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || null);

        // Reset previous results
        setReportData(null);
        setResponseText(null);
        setPositionScore(null);
        setConfidence(null);
        setAnalysisData(null);
        setShowWoodTypeButtons(false);
        setLastError(null);
      } else {
        logInfo(
          COMPONENT_NAME,
          "takePicture",
          "Camera capture canceled or no image captured"
        );
      }
    } catch (error) {
      const errorMsg = logError(COMPONENT_NAME, "takePicture", error);
      setLastError(errorMsg);
      Alert.alert(
        "Camera Error",
        "There was an error taking a picture: " + error.message
      );
    }
  };

  // Helper: Get a label based on the regression score
  const getPositionLabel = (score) => {
    try {
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
    } catch (error) {
      logError(COMPONENT_NAME, "getPositionLabel", error);
      return "Unknown";
    }
  };

  // Modified analyze function - now shows wood type buttons instead of alert
  const analyzeImage = () => {
    try {
      logInfo(COMPONENT_NAME, "analyzeImage", "Analyze button pressed");

      if (!imageUri || !imageBase64) {
        logInfo(COMPONENT_NAME, "analyzeImage", "No image selected");
        Alert.alert(
          st.noImage || "No Image",
          st.selectFirst || "Please select an image first"
        );
        return;
      }

      logInfo(
        COMPONENT_NAME,
        "analyzeImage",
        "Showing wood type selection buttons"
      );

      // Set the mode to 'analyze' and show the wood type buttons
      setWoodSelectionMode("analyze");
      setShowWoodTypeButtons(true);
    } catch (error) {
      const errorMsg = logError(COMPONENT_NAME, "analyzeImage", error);
      setLastError(errorMsg);
      Alert.alert(
        "Error",
        "There was an error when trying to analyze the image: " + error.message
      );
    }
  };

  // Helper function to format wood type for display
  const formatWoodType = (woodType) => {
    try {
      switch (woodType) {
        case "medium-cherry":
          return st.mediumCherry || "Medium Cherry";
        case "desert-oak":
          return st.desertOak || "Desert Oak";
        case "graphite-walnut":
          return st.graphiteWalnut || "Graphite Walnut";
        default:
          return woodType;
      }
    } catch (error) {
      logError(COMPONENT_NAME, "formatWoodType", error);
      return woodType || "Unknown";
    }
  };

  // Helper function to format category for display
  const formatCategory = (category) => {
    try {
      switch (category) {
        case "in-range-dark":
          return st.inRangeDark || "Dark (In Range)";
        case "in-range-light":
          return st.inRangeLight || "Light (In Range)";
        case "in-range-standard":
          return st.inRangeStandard || "Standard (In Range)";
        case "out-of-range-too-dark":
          return st.outOfRangeTooDark || "Too Dark (Out of Range)";
        case "out-of-range-too-light":
          return st.outOfRangeTooLight || "Too Light (Out of Range)";
        default:
          return category;
      }
    } catch (error) {
      logError(COMPONENT_NAME, "formatCategory", error);
      return category || "Unknown";
    }
  };

  // Handle wood type selection from buttons
  const handleWoodTypeSelection = (woodType) => {
    try {
      logInfo(
        COMPONENT_NAME,
        "handleWoodTypeSelection",
        `Wood type selected: ${woodType}`
      );

      // Hide the wood type buttons
      setShowWoodTypeButtons(false);
      const currentMode = woodSelectionMode;
      // Process the wood classification based on selection mode
      if (woodSelectionMode === "analyze") {
        processWoodClassification(woodType, currentMode);
      } else if (woodSelectionMode === "report") {
        processWoodClassification(woodType, currentMode);
      }

      // Reset the selection mode
      setWoodSelectionMode(null);
    } catch (error) {
      const errorMsg = logError(
        COMPONENT_NAME,
        "handleWoodTypeSelection",
        error
      );
      setLastError(errorMsg);
      Alert.alert(
        "Error",
        "There was an error processing your selection: " + error.message
      );
    }
  };

  // Legacy function for backward compatibility
  const analyzeByWoodType = async (woodType) => {
    try {
      logInfo(
        COMPONENT_NAME,
        "analyzeByWoodType",
        `Starting analysis for wood type: ${woodType}`
      );
      setIsLoading(true);

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

      logInfo(
        COMPONENT_NAME,
        "analyzeByWoodType",
        `Using endpoints - original: ${endpointUrl}, rgb: ${BACKEND_URLS.classify_wood}`
      );

      // Call the original endpoint
      logInfo(COMPONENT_NAME, "analyzeByWoodType", "Calling original endpoint");
      const originalResponse = await axios.post(
        endpointUrl,
        { image: imageBase64, mimeType: "image/jpeg" },
        { headers: { "Content-Type": "application/json" } }
      );

      logInfo(
        COMPONENT_NAME,
        "analyzeByWoodType",
        `Original endpoint response status: ${originalResponse.status}`
      );

      const result = originalResponse.data?.result;

      if (originalResponse.data?.position_score !== undefined) {
        logInfo(
          COMPONENT_NAME,
          "analyzeByWoodType",
          `Setting position score: ${originalResponse.data.position_score}`
        );
        setPositionScore(originalResponse.data.position_score);
        setConfidence(originalResponse.data.confidence || 95);
      }

      // Call the RGB classification endpoint
      logInfo(
        COMPONENT_NAME,
        "analyzeByWoodType",
        "Calling RGB classification endpoint"
      );
      const rgbResponse = await axios.post(
        BACKEND_URLS.classify_wood,
        {
          image: imageBase64,
          color: rgbWoodType,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      logInfo(
        COMPONENT_NAME,
        "analyzeByWoodType",
        `RGB endpoint response status: ${rgbResponse.status}`
      );

      const rgbResults = rgbResponse.data;
      logInfo(
        COMPONENT_NAME,
        "analyzeByWoodType",
        `RGB Results - predicted: ${rgbResults.predicted_category}, main: ${rgbResults.main_category}`
      );

      const predictedCategory = rgbResults.predicted_category;
      const mainCategory = rgbResults.main_category;
      const similarityScores = rgbResults.similarity_scores;

      // Format and sort similarity scores from highest to lowest
      let sortedScores = [];
      if (similarityScores) {
        sortedScores = Object.entries(similarityScores)
          .map(([category, score]) => ({
            category: formatCategory(category),
            score: score * 100, // Convert to percentage
          }))
          .sort((a, b) => b.score - a.score); // Sort highest to lowest
      }

      // Just set basic summary text, but we'll display it in a better way
      const resultText = `${formatWoodType(rgbWoodType)}`;

      // Store the detailed results for display
      const analysisData = {
        woodType: formatWoodType(rgbWoodType),
        predictedCategory: formatCategory(predictedCategory),
        mainCategory: mainCategory,
        isInRange: mainCategory === "in-range",
        similarityScores: sortedScores,
      };

      // Inside processWoodClassification
      if (woodSelectionMode === "analyze") {
        setAnalysisData(resultText);
        // Don't set reportData
      } else if (woodSelectionMode === "report") {
        setReportData(resultText);
        setAnalysisData(analysisData); // You might still want this for both modes
      }

      //setResponseText(resultText); // Just for backward compatibility
      //setAnalysisData(analysisData);

      logInfo(
        COMPONENT_NAME,
        "analyzeByWoodType",
        "Analysis complete, showing alert"
      );

      // Show simplified alert
      Alert.alert(
        "Analysis Complete",
        `Wood Type: ${formatWoodType(rgbWoodType)}\nResult: ${
          mainCategory === "in-range" ? "In Range" : "Out of Range"
        }`
      );

      setShowWoodTypeButtons(false);

      // Set position score for spectrum based on predicted category
      if (rgbResults.predicted_category && positionScore === null) {
        let mappedScore = 0.0;
        switch (rgbResults.predicted_category) {
          case "out-of-range-too-light":
            mappedScore = 1.0; // Very light (right end of spectrum)
            break;
          case "in-range-light":
            mappedScore = 0.5; // Light
            break;
          case "in-range-standard":
            mappedScore = 0.0; // Standard/middle
            break;
          case "in-range-dark":
            mappedScore = -0.5; // Dark
            break;
          case "out-of-range-too-dark":
            mappedScore = -1.0; // Very dark (left end of spectrum)
            break;
          default:
            mappedScore = 0.0; // Default to middle if unknown
            break;
        }
        setPositionScore(mappedScore);
      }

      // Send notification if enabled
      try {
        logInfo(COMPONENT_NAME, "analyzeByWoodType", "Scheduling notification");
        await scheduleNotification(
          st.analysisNotification || "Analysis Complete",
          st.analysisNotificationBody || "Your wood analysis is complete.",
          settings
        );
      } catch (notifError) {
        logError(COMPONENT_NAME, "analyzeByWoodType.notification", notifError);
        // Don't alert for notification errors
      }
    } catch (error) {
      const errorMsg = logError(COMPONENT_NAME, "analyzeByWoodType", error);
      setLastError(errorMsg);

      if (axios.isAxiosError(error)) {
        logError(
          COMPONENT_NAME,
          "analyzeByWoodType.axios",
          `Status: ${error.response?.status}, Data: ${JSON.stringify(
            error.response?.data
          )}`
        );

        Alert.alert(
          "Error",
          `Failed to analyze image: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        Alert.alert("Error", `Failed to analyze image: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
      logInfo(COMPONENT_NAME, "analyzeByWoodType", "Analysis process finished");
    }
  };

  // Generate Full Report - now shows wood type buttons instead of alert
  const generateFullReport = async () => {
    try {
      logInfo(
        COMPONENT_NAME,
        "generateFullReport",
        "Generate report button pressed"
      );

      if (!imageUri || !imageBase64) {
        logInfo(COMPONENT_NAME, "generateFullReport", "No image selected");
        Alert.alert(
          st.noImage || "No Image",
          st.selectFirst || "Please select an image first"
        );
        return;
      }

      logInfo(
        COMPONENT_NAME,
        "generateFullReport",
        "Showing wood type selection buttons"
      );

      // Set the mode to 'report' and show the wood type buttons
      setWoodSelectionMode("report");
      setShowWoodTypeButtons(true);
    } catch (error) {
      const errorMsg = logError(COMPONENT_NAME, "generateFullReport", error);
      setLastError(errorMsg);
      Alert.alert(
        "Error",
        "There was an error when trying to generate the report: " +
          error.message
      );
    }
  };

  // Shared function to process wood classification - used by both analyze and generate report
  const processWoodClassification = async (woodType, currentMode) => {
    try {
      logInfo(
        COMPONENT_NAME,
        "processWoodClassification",
        `Processing classification for wood type: ${woodType}`
      );
      setIsLoading(true);
      setIsGeneratingReport(true);

      // Validate BACKEND_URLS
      if (!BACKEND_URLS || !BACKEND_URLS.classify_wood) {
        throw new Error(
          "Backend URL configuration is missing. Check your config file."
        );
      }

      logInfo(
        COMPONENT_NAME,
        "processWoodClassification",
        `Using endpoint: ${BACKEND_URLS.classify_wood}`
      );

      // Validate that we have image data
      if (!imageBase64) {
        throw new Error(
          "Image data is missing. Please try selecting the image again."
        );
      }

      // Make API request
      logInfo(
        COMPONENT_NAME,
        "processWoodClassification",
        "Calling classify_wood endpoint"
      );
      const response = await axios.post(
        BACKEND_URLS.classify_wood,
        {
          image: imageBase64,
          color: woodType,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 30000, // 30 second timeout
        }
      );

      logInfo(
        COMPONENT_NAME,
        "processWoodClassification",
        `API response status: ${response.status}`
      );

      // Validate response
      if (!response.data || !response.data.success) {
        throw new Error(
          `Failed to classify wood: ${response.data?.error || "Unknown error"}`
        );
      }

      logInfo(
        COMPONENT_NAME,
        "processWoodClassification",
        `Classification results - main: ${response.data.main_category}, predicted: ${response.data.predicted_category}`
      );

      // Normalize and convert similarity scores to percentages
      const scores = response.data.similarity_scores;
      if (!scores) {
        throw new Error("Similarity scores missing from API response");
      }

      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

      if (totalScore <= 0) {
        throw new Error("Invalid similarity scores: total is zero or negative");
      }

      const normalizedScores = {};

      for (const [category, score] of Object.entries(scores)) {
        normalizedScores[category] = (score / totalScore) * 100;
      }

      // Set position score for spectrum bar
      const category = response.data.predicted_category;
      let mappedScore = 0.0;
      // Map the category to a score between -1 and 1 for the spectrum
      switch (category) {
        case "out-of-range-too-light":
          mappedScore = 1.0; // Very light (right end of spectrum)
          break;
        case "in-range-light":
          mappedScore = 0.5; // Light
          break;
        case "in-range-standard":
          mappedScore = 0.0; // Standard/middle
          break;
        case "in-range-dark":
          mappedScore = -0.5; // Dark
          break;
        case "out-of-range-too-dark":
          mappedScore = -1.0; // Very dark (left end of spectrum)
          break;
        default:
          mappedScore = 0.0; // Default to middle if unknown
          break;
      }

      logInfo(
        COMPONENT_NAME,
        "processWoodClassification",
        `Setting position score: ${mappedScore}`
      );
      setPositionScore(mappedScore);

      // Format and sort similarity scores from highest to lowest
      let sortedScores = [];
      if (scores) {
        sortedScores = Object.entries(normalizedScores)
          .map(([category, score]) => ({
            category: formatCategory(category),
            score: score, // Already a percentage
          }))
          .sort((a, b) => b.score - a.score); // Sort highest to lowest
      }

      // Format data for display
      const formattedData = {
        wood_type: {
          classification: woodType,
          confidence: normalizedScores[response.data.predicted_category], // Use the predicted category's score as confidence
        },
        main_result: {
          category: response.data.main_category,
          predicted: response.data.predicted_category,
        },
        all_probabilities: normalizedScores,
      };

      // Store the detailed results for display
      const analysisData = {
        woodType: formatWoodType(woodType),
        predictedCategory: formatCategory(response.data.predicted_category),
        mainCategory: response.data.main_category,
        isInRange: response.data.main_category === "in-range",
        similarityScores: sortedScores,
      };

      logInfo(
        COMPONENT_NAME,
        "processWoodClassification",
        "Setting state with analysis results"
      );

      // Near the end, modify this part:
      if (currentMode === "analyze") {
        setAnalysisData(analysisData);
        setReportData(null); // Explicitly clear report data
      } else if (currentMode === "report") {
        setReportData(formattedData);
        setAnalysisData(analysisData); // Keep this for both modes if needed
      }

      const mainCategory =
        response.data.main_category === "in-range"
          ? st.inRange || "In Range"
          : st.outOfRange || "Out of Range";

      const summary = `Wood Type: ${formatWoodType(
        woodType
      )}\nResult: ${mainCategory}\nCategory: ${formatCategory(
        response.data.predicted_category
      )}`;

      logInfo(
        COMPONENT_NAME,
        "processWoodClassification",
        "Analysis complete, showing alert"
      );
      Alert.alert(
        st.reportGenerated || "Report Generated",
        summary + "\n\n" + (st.seeDetails || "See details below.")
      );

      // Send notification if enabled
      try {
        logInfo(
          COMPONENT_NAME,
          "processWoodClassification",
          "Scheduling notification"
        );
        await scheduleNotification(
          st.reportNotification || "Report Generated",
          st.reportNotificationBody || "Your wood analysis report is ready.",
          settings
        );
      } catch (notifError) {
        logError(
          COMPONENT_NAME,
          "processWoodClassification.notification",
          notifError
        );
        // Don't alert for notification errors
      }
    } catch (error) {
      const errorMsg = logError(
        COMPONENT_NAME,
        "processWoodClassification",
        error
      );
      setLastError(errorMsg);

      if (axios.isAxiosError(error)) {
        // Extract more detailed error information for Axios errors
        const statusCode = error.response?.status || "unknown";
        const responseData =
          JSON.stringify(error.response?.data) || "No response data";
        const requestUrl = error.config?.url || "unknown URL";

        logError(
          COMPONENT_NAME,
          "processWoodClassification.axios",
          `Failed request to ${requestUrl} with status ${statusCode}: ${responseData}`
        );

        Alert.alert(
          "Classification Error",
          `Failed to classify wood: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        Alert.alert(
          "Classification Error",
          `Failed to classify wood: ${error.message}`
        );
      }
    } finally {
      setIsGeneratingReport(false);
      setIsLoading(false);
      logInfo(
        COMPONENT_NAME,
        "processWoodClassification",
        "Classification process finished"
      );
    }
  };

  // Reupload: resets image and response state
  const reuploadImage = () => {
    try {
      logInfo(COMPONENT_NAME, "reuploadImage", "Resetting all state");
      setImageUri(null);
      setImageBase64(null);
      setResponseText(null);
      setPositionScore(null);
      setConfidence(null);
      setReportData(null);
      setAnalysisData(null);
      setShowWoodTypeButtons(false);
      setWoodSelectionMode(null);
      setLastError(null);
    } catch (error) {
      const errorMsg = logError(COMPONENT_NAME, "reuploadImage", error);
      setLastError(errorMsg);
      Alert.alert("Error", "Failed to reset the image state: " + error.message);
    }
  };

  const saveReport = async () => {
    try {
      logInfo(
        COMPONENT_NAME,
        "saveReport",
        "Attempting to save report to Firestore"
      );

      if (!reportData) {
        logInfo(COMPONENT_NAME, "saveReport", "No report data available");
        Alert.alert(
          st.noImage || "No Report",
          st.selectFirst || "Please analyze an image first"
        );
        return;
      }

      // Validate Firebase setup
      if (!db || !collection) {
        throw new Error("Firebase database is not properly configured");
      }

      // Create the document data
      const reportDataToSave = {
        WoodType:
          reportData.wood_type?.classification || st.unknown || "Unknown",
        Category: reportData.main_result?.predicted || st.unknown || "Unknown",
        Result: reportData.main_result?.category || st.unknown || "Unknown",
        Date: new Date().toISOString(),
        Platform: Platform.OS,
        AppVersion: "1.0.0", // You can use a constant or dynamic version
      };

      logInfo(
        COMPONENT_NAME,
        "saveReport",
        `Saving report data: ${JSON.stringify(reportDataToSave)}`
      );

      // Add to Firestore
      const docRef = await addDoc(collection(db, "Reports"), reportDataToSave);

      logInfo(
        COMPONENT_NAME,
        "saveReport",
        `Document written with ID: ${docRef.id}`
      );
      Alert.alert("Success", st.reportSaved || "Report saved successfully");
    } catch (error) {
      const errorMsg = logError(COMPONENT_NAME, "saveReport", error);
      setLastError(errorMsg);
      Alert.alert(
        "Error",
        st.errorSaving || "Error saving report: " + error.message
      );
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
      marginBottom: 16,
    },
    woodTypeButton: {
      backgroundColor: "#5E35B1", // Purple color for the buttons
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 10,
      width: "100%",
      alignItems: "center",
      shadowColor: "#5E35B1",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      marginBottom: 8,
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
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    resultHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    woodTypeLabel: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    resultBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    resultBadgeText: {
      color: "white",
      fontWeight: "600",
      fontSize: 14,
    },
    categoryText: {
      fontSize: 16,
      color: colors.secondaryText,
      marginBottom: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
      width: "100%",
    },
    scoresSectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    scoreNameContainer: {
      width: "40%",
    },
    scoreName: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    scoreBarContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    scoreBarBackground: {
      flex: 1,
      height: 8,
      backgroundColor: colors.darkMode ? "#333333" : "#EFEFEF",
      borderRadius: 4,
      overflow: "hidden",
      marginRight: 8,
    },
    scoreBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    scoreValue: {
      width: 45,
      fontSize: 13,
      textAlign: "right",
      color: colors.text,
    },
    detailsButton: {
      alignSelf: "center",
      marginTop: 16,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    detailsButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "500",
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
      width: 140,
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
    errorContainer: {
      padding: 12,
      marginVertical: 8,
      backgroundColor: "#FFF0F0",
      borderWidth: 1,
      borderColor: "#FFB6B6",
      borderRadius: 8,
    },
    errorText: {
      color: "#D32F2F",
      fontSize: 12,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContainer}>
        <View style={dynamicStyles.container}>
          <Text style={dynamicStyles.appTitle}>{st.appTitle}</Text>

          {/* Development Error Display - remove in production */}
          {__DEV__ && lastError && (
            <View style={dynamicStyles.errorContainer}>
              <Text style={dynamicStyles.errorText}>{lastError}</Text>
            </View>
          )}

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
                    {woodSelectionMode === "analyze"
                      ? st.selectWoodTypeMsg ||
                        "Please select the wood type you want to analyze"
                      : st.selectWoodTypeMsg ||
                        "Please select the wood type you want to analyze"}
                  </Text>

                  <TouchableOpacity
                    style={dynamicStyles.woodTypeButton}
                    onPress={() => handleWoodTypeSelection("medium-cherry")}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {st.mediumCherry || "Medium Cherry"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.woodTypeButton}
                    onPress={() => handleWoodTypeSelection("desert-oak")}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {st.desertOak || "Desert Oak"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.woodTypeButton}
                    onPress={() => handleWoodTypeSelection("graphite-walnut")}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {st.graphiteWalnut || "Graphite Walnut"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.cancelButton}
                    onPress={() => {
                      setShowWoodTypeButtons(false);
                      setWoodSelectionMode(null);
                    }}
                  >
                    <Text style={dynamicStyles.cancelButtonText}>
                      {st.cancel || "Cancel"}
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
                    testID="analyze-button"
                    accessible={true}
                    accessibilityLabel="Analyze"
                    accessibilityHint="Analyzes the current image"
                  >
                    <Text style={dynamicStyles.buttonText}>{st.analyze}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.actionButton}
                    onPress={generateFullReport}
                    testID="generate-report-button"
                    accessible={true}
                    accessibilityLabel="Generate Report"
                    accessibilityHint="Generates a full report for the current image"
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {st.generateReport}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={dynamicStyles.resetButton}
                    onPress={reuploadImage}
                    testID="new-image-button"
                    accessible={true}
                    accessibilityLabel="New Image"
                    accessibilityHint="Start over with a new image"
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
                      <Text style={dynamicStyles.spectrumLabel}>
                        {st.tooDark || "Too Dark"}
                      </Text>
                      <Text style={dynamicStyles.spectrumLabel}>
                        {st.tooLight || "Too Light"}
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
                    {/* Confidence label removed */}
                  </View>
                </View>
              )}

              {/* Enhanced Analysis Results Card */}
              {analysisData && (
                <View
                  style={dynamicStyles.responseCard}
                  testID="analysis-results-card"
                >
                  <Text style={dynamicStyles.responseTitle}>
                    {st.analysisResults || "Analysis Results"}
                  </Text>

                  <View style={dynamicStyles.resultHeader}>
                    <Text style={dynamicStyles.woodTypeLabel}>
                      {analysisData.woodType}
                    </Text>

                    <View
                      style={[
                        dynamicStyles.resultBadge,
                        {
                          backgroundColor: analysisData.isInRange
                            ? "#4CAF50"
                            : "#FF9800",
                        },
                      ]}
                    >
                      <Text style={dynamicStyles.resultBadgeText}>
                        {analysisData.isInRange
                          ? st.inRange || "In Range"
                          : st.outOfRange || "Out of Range"}
                      </Text>
                    </View>
                  </View>

                  <Text style={dynamicStyles.categoryText}>
                    {st.category || "Category"}:{" "}
                    {analysisData.predictedCategory}
                  </Text>

                  <View style={dynamicStyles.divider} />

                  <Text style={dynamicStyles.scoresSectionTitle}>
                    {st.categorySimilarity || "Category Similarity"}
                  </Text>

                  {analysisData.similarityScores.map((item, index) => (
                    <View
                      key={index}
                      style={dynamicStyles.scoreRow}
                      testID={`score-row-${index}`}
                    >
                      <View style={dynamicStyles.scoreNameContainer}>
                        <Text style={dynamicStyles.scoreName}>
                          {item.category}
                        </Text>
                      </View>
                      <View style={dynamicStyles.scoreBarContainer}>
                        <View style={dynamicStyles.scoreBarBackground}>
                          <View
                            style={[
                              dynamicStyles.scoreBarFill,
                              {
                                width: `${item.score}%`,
                                backgroundColor:
                                  index === 0 ? colors.primary : "#607D8B",
                              },
                            ]}
                          />
                        </View>
                        <Text style={dynamicStyles.scoreValue}>
                          {item.score.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Full Report Results */}
              {reportData && (
                <View
                  style={dynamicStyles.reportContainer}
                  testID="full-report-container"
                >
                  <Text style={dynamicStyles.reportTitle}>
                    {st.reportTitle || "Wood Analysis Report"}
                  </Text>

                  <View style={dynamicStyles.reportSection}>
                    <Text style={dynamicStyles.sectionHeader}>
                      {st.woodClassification}
                    </Text>
                    <Text style={dynamicStyles.woodType}>
                      {formatWoodType(reportData.wood_type?.classification) ||
                        st.unknown}
                    </Text>

                    {reportData.main_result && (
                      <View
                        style={[
                          dynamicStyles.resultBadge,
                          {
                            backgroundColor:
                              reportData.main_result.category === "in-range"
                                ? "#4CAF50"
                                : "#FF9800",
                          },
                        ]}
                      >
                        <Text style={dynamicStyles.resultBadgeText}>
                          {reportData.main_result.category === "in-range"
                            ? st.inRange || "In Range"
                            : st.outOfRange || "Out of Range"}
                        </Text>
                      </View>
                    )}

                    {reportData.main_result && (
                      <Text style={dynamicStyles.categoryText}>
                        {st.category || "Category"}:{" "}
                        {formatCategory(reportData.main_result.predicted)}
                      </Text>
                    )}

                    {/* Probability distribution */}
                    {reportData.all_probabilities && (
                      <View style={dynamicStyles.probabilitiesContainer}>
                        <Text style={dynamicStyles.probabilitiesHeader}>
                          {st.categorySimilarity || "Category Similarity"}
                        </Text>
                        {Object.entries(reportData.all_probabilities)
                          .sort(([, a], [, b]) => b - a) // Sort by value, highest first
                          .map(([key, value], index) => (
                            <View
                              key={key}
                              style={dynamicStyles.probabilityRow}
                              testID={`probability-row-${index}`}
                            >
                              <Text style={dynamicStyles.probabilityName}>
                                {formatCategory(key)}
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

                  <View style={dynamicStyles.reportActions}>
                    <TouchableOpacity
                      style={dynamicStyles.saveButton}
                      onPress={saveReport}
                      testID="save-report-button"
                    >
                      <Text style={dynamicStyles.buttonText}>
                        {st.saveReport || "Save Report"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={dynamicStyles.shareButton}
                      onPress={() => Linking.openURL(mailtoLink)}
                      testID="share-report-button"
                    >
                      <Text style={dynamicStyles.buttonText}>
                        {st.shareResults || "Share"}
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
