import React, { useState, useEffect, createContext, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import translations from "../../assets/translations/textTranslationsIndex";
// Create a context to share settings across components
export const SettingsContext = createContext(null);

// Create a hook for easy access to settings
export const useSettings = () => useContext(SettingsContext);

// Setup notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permission for notifications
const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
};

// Function to create a notification
export const scheduleNotification = async (title, body, settings) => {
  // Check if notifications are enabled in settings
  if (!settings.notificationsEnabled) return;

  // Check if the specific type of notification is enabled
  if (title.includes("Analysis") && !settings.analysisNotifications) return;
  if (title.includes("Report") && !settings.reportNotifications) return;

  // Check for permission
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Schedule the notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: null, // Show immediately
  });
};

// Create a provider component to wrap the app
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    language: "en",
    notificationsEnabled: true,
    analysisNotifications: true,
    reportNotifications: true,
    darkMode: false,
    autoSave: true,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem("appSettings");
        if (savedSettings !== null) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to AsyncStorage
  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem("appSettings", JSON.stringify(newSettings));
      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  };

  return (
    <SettingsContext.Provider
      value={{ settings, setSettings, saveSettings, isLoading }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Theme colors
export const getThemeColors = (darkMode) => {
  if (darkMode) {
    return {
      background: "#121212",
      card: "#1E1E1E",
      text: "#E0E0E0",
      secondaryText: "#9E9E9E",
      primary: "#8A3FFC",
      secondary: "#B69EFC",
      border: "#333333",
      switch: {
        track: { false: "#555555", true: "#B69EFC" },
        thumb: { false: "#AAAAAA", true: "#8A3FFC" },
      },
    };
  } else {
    return {
      background: "#F9F9FC",
      card: "#FFFFFF",
      text: "#35343D",
      secondaryText: "#666666",
      primary: "#8A3FFC",
      secondary: "#B69EFC",
      border: "#D9D9E3",
      switch: {
        track: { false: "#D9D9E3", true: "#B69EFC" },
        thumb: { false: "#f4f3f4", true: "#8A3FFC" },
      },
    };
  }
};

export default function SettingsScreen() {
  // Use the settings context
  const { settings, setSettings, saveSettings, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  // Get translations for current language
  const t = translations[settings.language] || translations.en;

  // Get theme colors
  const colors = getThemeColors(settings.darkMode);

  // Languages available in the app
  const languages = [
    { label: "English", value: "en" },
    { label: "Español", value: "es" },
    { label: "Français", value: "fr" },
    { label: "Deutsch", value: "de" },
    { label: "中文", value: "zh" },
  ];

  // Update a single setting
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (settings.autoSave) {
      saveSettingsToStorage(newSettings);
    }
  };

  // Save settings to AsyncStorage
  const saveSettingsToStorage = async (settingsToSave = settings) => {
    try {
      setIsSaving(true);
      const success = await saveSettings(settingsToSave);

      // Only show confirmation if not autosaving
      if (!settings.autoSave && success) {
        Alert.alert(t.success, t.settingsSaved);
      } else if (!success) {
        Alert.alert(t.error, t.settingsSaveError);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert(t.error, t.settingsSaveError);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings to defaults
  const resetSettings = () => {
    Alert.alert(t.resetSettingsTitle, t.resetSettingsDesc, [
      {
        text: t.cancel,
        style: "cancel",
      },
      {
        text: t.reset,
        onPress: async () => {
          const defaultSettings = {
            language: "en",
            notificationsEnabled: true,
            analysisNotifications: true,
            reportNotifications: true,
            darkMode: false,
            autoSave: true,
          };

          setSettings(defaultSettings);

          if (!settings.autoSave) {
            await saveSettingsToStorage(defaultSettings);
          }
        },
        style: "destructive",
      },
    ]);
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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.primary,
    },
    appTitle: {
      fontSize: 28,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
      marginBottom: 16,
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      width: "100%",
      marginVertical: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.secondaryText,
      marginBottom: 16,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: "hidden",
      marginTop: 8,
    },
    picker: {
      height: Platform.OS === "ios" ? 150 : 50,
      width: "100%",
      color: colors.text,
      marginTop: Platform.OS === "ios" ? -60 : 0,
      marginBottom: Platform.OS === "ios" ? 60 : 0,
    },
    pickerItem: {
      fontSize: 16,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.darkMode ? "#333333" : "#F5F5F5",
    },
    settingTextContainer: {
      flex: 1,
      paddingRight: 16,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    buttonContainer: {
      marginTop: 24,
      gap: 12,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    buttonLoader: {
      marginLeft: 8,
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
    },
    resetButtonText: {
      color: colors.secondaryText,
      fontSize: 16,
      fontWeight: "500",
    },
    supportRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.darkMode ? "#333333" : "#F5F5F5",
    },
    supportText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
    },
    chevron: {
      marginLeft: 8,
    },
    versionContainer: {
      alignItems: "center",
      marginTop: 24,
      marginBottom: 16,
    },
    versionText: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 20,
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={dynamicStyles.loadingText}>{t.loadingSettings}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContainer}>
        <View style={dynamicStyles.container}>
          <Text style={dynamicStyles.appTitle}>{t.settings}</Text>

          {/* Language Settings */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.sectionHeader}>{t.language}</Text>
            <Text style={dynamicStyles.sectionDescription}>
              {t.languageDesc}
            </Text>

            <View style={dynamicStyles.pickerContainer}>
              <Picker
                selectedValue={settings.language}
                onValueChange={(value) => updateSetting("language", value)}
                style={dynamicStyles.picker}
                dropdownIconColor={colors.primary}
                mode="dropdown"
                itemStyle={dynamicStyles.pickerItem}
              >
                {languages.map(({ label, value }) => (
                  <Picker.Item
                    key={value}
                    label={label}
                    value={value}
                    color={Platform.OS === "ios" ? colors.text : undefined}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Notification Settings */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.sectionHeader}>{t.notifications}</Text>
            <Text style={dynamicStyles.sectionDescription}>
              {t.notificationsDesc}
            </Text>

            <View style={dynamicStyles.settingRow}>
              <View style={dynamicStyles.settingTextContainer}>
                <Text style={dynamicStyles.settingLabel}>
                  {t.enableNotifications}
                </Text>
                <Text style={dynamicStyles.settingDescription}>
                  {t.notificationsToggleDesc}
                </Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(value) =>
                  updateSetting("notificationsEnabled", value)
                }
                trackColor={colors.switch.track}
                thumbColor={
                  settings.notificationsEnabled
                    ? colors.switch.thumb.true
                    : colors.switch.thumb.false
                }
                ios_backgroundColor={colors.switch.track.false}
              />
            </View>

            {settings.notificationsEnabled && (
              <>
                <View style={dynamicStyles.settingRow}>
                  <View style={dynamicStyles.settingTextContainer}>
                    <Text style={dynamicStyles.settingLabel}>
                      {t.analysisResults}
                    </Text>
                    <Text style={dynamicStyles.settingDescription}>
                      {t.analysisResultsDesc}
                    </Text>
                  </View>
                  <Switch
                    value={settings.analysisNotifications}
                    onValueChange={(value) =>
                      updateSetting("analysisNotifications", value)
                    }
                    trackColor={colors.switch.track}
                    thumbColor={
                      settings.analysisNotifications
                        ? colors.switch.thumb.true
                        : colors.switch.thumb.false
                    }
                    ios_backgroundColor={colors.switch.track.false}
                  />
                </View>

                <View style={dynamicStyles.settingRow}>
                  <View style={dynamicStyles.settingTextContainer}>
                    <Text style={dynamicStyles.settingLabel}>
                      {t.reportGeneration}
                    </Text>
                    <Text style={dynamicStyles.settingDescription}>
                      {t.reportGenerationDesc}
                    </Text>
                  </View>
                  <Switch
                    value={settings.reportNotifications}
                    onValueChange={(value) =>
                      updateSetting("reportNotifications", value)
                    }
                    trackColor={colors.switch.track}
                    thumbColor={
                      settings.reportNotifications
                        ? colors.switch.thumb.true
                        : colors.switch.thumb.false
                    }
                    ios_backgroundColor={colors.switch.track.false}
                  />
                </View>
              </>
            )}
          </View>

          {/* Appearance Settings */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.sectionHeader}>{t.appearance}</Text>
            <Text style={dynamicStyles.sectionDescription}>
              {t.appearanceDesc}
            </Text>

            <View style={dynamicStyles.settingRow}>
              <View style={dynamicStyles.settingTextContainer}>
                <Text style={dynamicStyles.settingLabel}>{t.darkMode}</Text>
                <Text style={dynamicStyles.settingDescription}>
                  {t.darkModeDesc}
                </Text>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={(value) => updateSetting("darkMode", value)}
                trackColor={colors.switch.track}
                thumbColor={
                  settings.darkMode
                    ? colors.switch.thumb.true
                    : colors.switch.thumb.false
                }
                ios_backgroundColor={colors.switch.track.false}
              />
            </View>
          </View>

          {/* Storage Settings */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.sectionHeader}>{t.storageData}</Text>
            <Text style={dynamicStyles.sectionDescription}>
              {t.storageDataDesc}
            </Text>

            <View style={dynamicStyles.settingRow}>
              <View style={dynamicStyles.settingTextContainer}>
                <Text style={dynamicStyles.settingLabel}>{t.autoSave}</Text>
                <Text style={dynamicStyles.settingDescription}>
                  {t.autoSaveDesc}
                </Text>
              </View>
              <Switch
                value={settings.autoSave}
                onValueChange={(value) => updateSetting("autoSave", value)}
                trackColor={colors.switch.track}
                thumbColor={
                  settings.autoSave
                    ? colors.switch.thumb.true
                    : colors.switch.thumb.false
                }
                ios_backgroundColor={colors.switch.track.false}
              />
            </View>

            <View style={dynamicStyles.buttonContainer}>
              {!settings.autoSave && (
                <TouchableOpacity
                  style={dynamicStyles.primaryButton}
                  onPress={() => saveSettingsToStorage()}
                  disabled={isSaving}
                >
                  <Text style={dynamicStyles.buttonText}>
                    {isSaving ? t.saving : t.saveSettings}
                  </Text>
                  {isSaving && (
                    <ActivityIndicator
                      size="small"
                      color="white"
                      style={dynamicStyles.buttonLoader}
                    />
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={dynamicStyles.resetButton}
                onPress={resetSettings}
              >
                <Text style={dynamicStyles.resetButtonText}>
                  {t.resetDefaults}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Support Section */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.sectionHeader}>{t.support}</Text>
            <Text style={dynamicStyles.sectionDescription}>
              {t.supportDesc}
            </Text>

            <TouchableOpacity style={dynamicStyles.supportRow}>
              <Ionicons
                name="help-circle-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={dynamicStyles.supportText}>{t.helpFaq}</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
                style={dynamicStyles.chevron}
              />
            </TouchableOpacity>

            <TouchableOpacity style={dynamicStyles.supportRow}>
              <Ionicons name="mail-outline" size={24} color={colors.primary} />
              <Text style={dynamicStyles.supportText}>{t.contactSupport}</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
                style={dynamicStyles.chevron}
              />
            </TouchableOpacity>

            <TouchableOpacity style={dynamicStyles.supportRow}>
              <Ionicons name="bug-outline" size={24} color={colors.primary} />
              <Text style={dynamicStyles.supportText}>{t.reportBug}</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondaryText}
                style={dynamicStyles.chevron}
              />
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.versionContainer}>
            <Text style={dynamicStyles.versionText}>{t.versionInfo}</Text>
            <Text style={dynamicStyles.versionText}>{t.version}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
