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
import { useSettings, getThemeColors, scheduleNotification } from "./settings";

import translations from "../../assets/translations/textTranslationsIndex";
import screenTranslations from "../../assets/translations/textTranslationsRgb";

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

  // Get settings from context
  const { settings } = useSettings();

  // Get translations for current language
  const t = translations[settings.language] || translations.en;

  // Get theme colors
  const colors = getThemeColors(settings.darkMode, settings.highContrast);

  // Get translations for this screen
  const st = screenTranslations[settings.language] || screenTranslations.en;

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
      return Alert.alert(st.error, st.noGalleryPermission);
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
      return Alert.alert(st.error, st.noCameraPermission);
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
      return Alert.alert(st.error, st.noGalleryPermission);
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
      return Alert.alert(st.error, st.noCameraPermission);
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
      Alert.alert(st.missingImages, st.selectBothImages);
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

        // Send notification if enabled
        await scheduleNotification(
          st.analysisNotification,
          st.analysisNotificationBody,
          settings
        );
      } else {
        Alert.alert(
          st.error,
          response.data.message || "Unknown error occurred"
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("API Error:", error.response?.data || error.message);
        Alert.alert(
          st.error,
          `${st.failedCalculate}${
            error.response?.data?.message || error.message
          }`
        );
      } else {
        console.error("Unexpected error:", error);
        Alert.alert(st.error, st.unexpectedError);
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
      return st.verySimilar;
    }
    if (value < MODERATE_THRESHOLD) {
      return st.moderateDifference;
    }
    return st.significantDifference;
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
    imageSection: {
      width: "100%",
      marginBottom: 20,
      backgroundColor: colors.card,
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
      color: colors.text,
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
      borderColor: colors.border,
      marginTop: 4,
    },
    disabledButton: {
      backgroundColor: colors.darkMode ? "#444444" : "#D9D9E3",
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
    resetButtonText: {
      color: colors.secondaryText,
      fontSize: 16,
      fontWeight: "500",
    },
    buttonLoader: {
      marginLeft: 10,
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
      marginBottom: 16,
    },
    responseText: {
      fontSize: 16,
      color: colors.text,
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
      color: colors.secondaryText,
    },
    differenceBarContainer: {
      width: "100%",
      marginBottom: 20,
    },
    differenceBar: {
      height: 12,
      backgroundColor: colors.darkMode ? "#333333" : "#EFEFEF",
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
      color: "#4CAF50", // Keep green color for "similar" label
    },
    barLabelRight: {
      fontSize: 14,
      color: "#F44336", // Keep red color for "different" label
    },
    interpretationText: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 20,
      textAlign: "center",
      color: colors.text,
    },
    infoBox: {
      backgroundColor: colors.darkMode ? "#222222" : "#F9F9FC",
      padding: 15,
      borderRadius: 12,
      width: "100%",
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContainer}>
        <View style={dynamicStyles.container}>
          <Text style={dynamicStyles.appTitle}>{st.appTitle}</Text>
          <Text style={dynamicStyles.instructionText}>{st.instruction}</Text>

          {/* Image 1 Section */}
          <View style={dynamicStyles.imageSection}>
            <Text style={dynamicStyles.sectionHeader}>{st.veneerSample1}</Text>

            {!image1Uri ? (
              <View style={dynamicStyles.startContainer}>
                <TouchableOpacity
                  style={dynamicStyles.primaryButton}
                  onPress={pickImage1}
                >
                  <Text style={dynamicStyles.buttonText}>
                    {st.chooseGallery}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={dynamicStyles.secondaryButton}
                  onPress={takePicture1}
                >
                  <Text style={dynamicStyles.secondaryButtonText}>
                    {st.takePhoto}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={dynamicStyles.analysisContainer}>
                <View style={dynamicStyles.imageFrame}>
                  <Image
                    source={{ uri: image1Uri }}
                    style={dynamicStyles.image}
                  />
                </View>
                <TouchableOpacity
                  style={dynamicStyles.secondaryButton}
                  onPress={pickImage1}
                >
                  <Text style={dynamicStyles.secondaryButtonText}>
                    {st.changeImage}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Image 2 Section */}
          <View style={dynamicStyles.imageSection}>
            <Text style={dynamicStyles.sectionHeader}>{st.veneerSample2}</Text>

            {!image2Uri ? (
              <View style={dynamicStyles.startContainer}>
                <TouchableOpacity
                  style={dynamicStyles.primaryButton}
                  onPress={pickImage2}
                >
                  <Text style={dynamicStyles.buttonText}>
                    {st.chooseGallery}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={dynamicStyles.secondaryButton}
                  onPress={takePicture2}
                >
                  <Text style={dynamicStyles.secondaryButtonText}>
                    {st.takePhoto}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={dynamicStyles.analysisContainer}>
                <View style={dynamicStyles.imageFrame}>
                  <Image
                    source={{ uri: image2Uri }}
                    style={dynamicStyles.image}
                  />
                </View>
                <TouchableOpacity
                  style={dynamicStyles.secondaryButton}
                  onPress={pickImage2}
                >
                  <Text style={dynamicStyles.secondaryButtonText}>
                    {st.changeImage}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {(image1Uri || image2Uri) && (
            <View style={dynamicStyles.actionButtonsContainer}>
              <TouchableOpacity
                style={[
                  dynamicStyles.actionButton,
                  (!image1Uri || !image2Uri || isLoading) &&
                    dynamicStyles.disabledButton,
                ]}
                onPress={calculateDifference}
                disabled={!image1Uri || !image2Uri || isLoading}
              >
                <Text style={dynamicStyles.buttonText}>
                  {isLoading ? st.calculating : st.calculateDifference}
                </Text>
                {isLoading && (
                  <ActivityIndicator
                    color="white"
                    style={dynamicStyles.buttonLoader}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={dynamicStyles.resetButton}
                onPress={resetImages}
              >
                <Text style={dynamicStyles.resetButtonText}>{st.reset}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Results Section */}
          {difference !== null && normalizedDifference !== null && (
            <View style={dynamicStyles.responseCard}>
              <Text style={dynamicStyles.responseTitle}>
                {st.comparisonResults}
              </Text>

              <View style={dynamicStyles.resultValueContainer}>
                <View
                  style={[
                    dynamicStyles.resultBadge,
                    {
                      backgroundColor: getDifferenceColor(normalizedDifference),
                    },
                  ]}
                >
                  <Text style={dynamicStyles.resultValue}>
                    {normalizedDifference.toFixed(2)}
                  </Text>
                </View>
                <Text style={dynamicStyles.resultLabel}>
                  {st.rgbDifference}
                </Text>
              </View>

              <View style={dynamicStyles.differenceBarContainer}>
                <View style={dynamicStyles.differenceBar}>
                  <View
                    style={[
                      dynamicStyles.differenceBarFill,
                      {
                        width: `${Math.min(100, normalizedDifference)}%`,
                        backgroundColor:
                          getDifferenceColor(normalizedDifference),
                      },
                    ]}
                  />
                </View>
                <View style={dynamicStyles.barLabels}>
                  <Text style={dynamicStyles.barLabelLeft}>{st.similar}</Text>
                  <Text style={dynamicStyles.barLabelRight}>
                    {st.different}
                  </Text>
                </View>
              </View>

              <Text style={dynamicStyles.interpretationText}>
                {getDifferenceInterpretation(normalizedDifference)}
              </Text>

              <View style={dynamicStyles.infoBox}>
                <Text style={dynamicStyles.infoTitle}>{st.whatDoesItMean}</Text>
                <Text style={dynamicStyles.responseText}>{st.explanation}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
