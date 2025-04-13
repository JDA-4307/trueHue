import React, { useState, useEffect } from "react";
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

export default function SettingsScreen() {
  // App settings state
  const [language, setLanguage] = useState("en");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [analysisNotifications, setAnalysisNotifications] = useState(true);
  const [reportNotifications, setReportNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Languages available in the app
  const languages = [
    { label: "English", value: "en" },
    { label: "Spanish", value: "es" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Chinese", value: "zh" },
  ];

  // Load saved settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem("appSettings");
        if (savedSettings !== null) {
          const settings = JSON.parse(savedSettings);
          setLanguage(settings.language || "en");
          setNotificationsEnabled(settings.notificationsEnabled ?? true);
          setAnalysisNotifications(settings.analysisNotifications ?? true);
          setReportNotifications(settings.reportNotifications ?? true);
          setDarkMode(settings.darkMode || false);
          setHighContrast(settings.highContrast || false);
          setAutoSave(settings.autoSave ?? true);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings when autoSave is enabled and settings change
  useEffect(() => {
    if (autoSave && !isLoading) {
      saveSettings();
    }
  }, [
    language,
    notificationsEnabled,
    analysisNotifications,
    reportNotifications,
    darkMode,
    highContrast,
    autoSave,
  ]);

  // Save settings to AsyncStorage
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const settings = {
        language,
        notificationsEnabled,
        analysisNotifications,
        reportNotifications,
        darkMode,
        highContrast,
        autoSave,
      };
      await AsyncStorage.setItem("appSettings", JSON.stringify(settings));

      // Only show confirmation if not autosaving
      if (!autoSave) {
        Alert.alert("Success", "Your settings have been saved successfully.");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings to defaults
  const resetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default values?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          onPress: async () => {
            setLanguage("en");
            setNotificationsEnabled(true);
            setAnalysisNotifications(true);
            setReportNotifications(true);
            setDarkMode(false);
            setHighContrast(false);
            setAutoSave(true);

            if (!autoSave) {
              await saveSettings();
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8A3FFC" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.appTitle}>Settings</Text>

          {/* Language Settings */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Language</Text>
            <Text style={styles.sectionDescription}>
              Select your preferred language for the app interface
            </Text>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={language}
                onValueChange={setLanguage}
                style={styles.picker}
                dropdownIconColor="#8A3FFC"
                mode="dropdown"
                itemStyle={styles.pickerItem}
              >
                {languages.map(({ label, value }) => (
                  <Picker.Item
                    key={value}
                    label={label}
                    value={value}
                    color={Platform.OS === "ios" ? "#35343D" : undefined}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Notification Settings */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Notifications</Text>
            <Text style={styles.sectionDescription}>
              Manage your notification preferences
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Enable Notifications</Text>
                <Text style={styles.settingDescription}>
                  Turn all notifications on or off
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#D9D9E3", true: "#B69EFC" }}
                thumbColor={notificationsEnabled ? "#8A3FFC" : "#f4f3f4"}
                ios_backgroundColor="#D9D9E3"
              />
            </View>

            {notificationsEnabled && (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Analysis Results</Text>
                    <Text style={styles.settingDescription}>
                      Receive notifications when wood analyses are complete
                    </Text>
                  </View>
                  <Switch
                    value={analysisNotifications}
                    onValueChange={setAnalysisNotifications}
                    trackColor={{ false: "#D9D9E3", true: "#B69EFC" }}
                    thumbColor={analysisNotifications ? "#8A3FFC" : "#f4f3f4"}
                    ios_backgroundColor="#D9D9E3"
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Report Generation</Text>
                    <Text style={styles.settingDescription}>
                      Receive notifications when reports are ready
                    </Text>
                  </View>
                  <Switch
                    value={reportNotifications}
                    onValueChange={setReportNotifications}
                    trackColor={{ false: "#D9D9E3", true: "#B69EFC" }}
                    thumbColor={reportNotifications ? "#8A3FFC" : "#f4f3f4"}
                    ios_backgroundColor="#D9D9E3"
                  />
                </View>
              </>
            )}
          </View>

          {/* Appearance Settings */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Appearance</Text>
            <Text style={styles.sectionDescription}>
              Customize the visual appearance of the app
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>
                  Use dark colors for the app interface
                </Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: "#D9D9E3", true: "#B69EFC" }}
                thumbColor={darkMode ? "#8A3FFC" : "#f4f3f4"}
                ios_backgroundColor="#D9D9E3"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>High Contrast</Text>
                <Text style={styles.settingDescription}>
                  Increase contrast for better readability
                </Text>
              </View>
              <Switch
                value={highContrast}
                onValueChange={setHighContrast}
                trackColor={{ false: "#D9D9E3", true: "#B69EFC" }}
                thumbColor={highContrast ? "#8A3FFC" : "#f4f3f4"}
                ios_backgroundColor="#D9D9E3"
              />
            </View>
          </View>

          {/* Storage Settings */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Storage & Data</Text>
            <Text style={styles.sectionDescription}>
              Manage how your settings and data are saved
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Auto-Save Settings</Text>
                <Text style={styles.settingDescription}>
                  Automatically save settings when changed
                </Text>
              </View>
              <Switch
                value={autoSave}
                onValueChange={setAutoSave}
                trackColor={{ false: "#D9D9E3", true: "#B69EFC" }}
                thumbColor={autoSave ? "#8A3FFC" : "#f4f3f4"}
                ios_backgroundColor="#D9D9E3"
              />
            </View>

            <View style={styles.buttonContainer}>
              {!autoSave && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={saveSettings}
                  disabled={isSaving}
                >
                  <Text style={styles.buttonText}>
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Text>
                  {isSaving && (
                    <ActivityIndicator
                      size="small"
                      color="white"
                      style={styles.buttonLoader}
                    />
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetSettings}
              >
                <Text style={styles.resetButtonText}>Reset to Defaults</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Support</Text>
            <Text style={styles.sectionDescription}>
              Get help with the app or report issues
            </Text>

            <TouchableOpacity style={styles.supportRow}>
              <Ionicons name="help-circle-outline" size={24} color="#8A3FFC" />
              <Text style={styles.supportText}>Help & FAQ</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#666"
                style={styles.chevron}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportRow}>
              <Ionicons name="mail-outline" size={24} color="#8A3FFC" />
              <Text style={styles.supportText}>Contact Support</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#666"
                style={styles.chevron}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportRow}>
              <Ionicons name="bug-outline" size={24} color="#8A3FFC" />
              <Text style={styles.supportText}>Report a Bug</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#666"
                style={styles.chevron}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Wood Analysis App</Text>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8A3FFC",
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: "#35343D",
    textAlign: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: "white",
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
    color: "#35343D",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D9D9E3",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
  },
  picker: {
    height: Platform.OS === "ios" ? 150 : 50,
    width: "100%",
    color: "#35343D",
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
    borderBottomColor: "#F5F5F5",
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#35343D",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#8A3FFC",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#8A3FFC",
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
    borderColor: "#D9D9E3",
  },
  resetButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  supportText: {
    flex: 1,
    fontSize: 16,
    color: "#35343D",
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
    color: "#666",
    lineHeight: 20,
  },
});
