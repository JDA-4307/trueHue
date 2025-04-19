import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Share,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useSettings, getThemeColors } from "./index";
import translations from "../../assets/translations/textTranslationsIndex";
import screenTranslations from "../../assets/translations/textTranslationsTwo";
import { useFocusEffect } from "@react-navigation/native";

interface Report {
  id: string;
  accuracy: string;
  date: string;
  wood_type: string;
  rawDate: string;
  image: string | null;
}

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const Two = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedWoodType, setSelectedWoodType] = useState<string>("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-renders

  // Get settings from context
  const { settings } = useSettings();

  // Get translations for current language
  const t = translations[settings.language] || translations.en;

  // Get theme colors
  const colors = getThemeColors(settings.darkMode, settings.highContrast);

  // Get translations for this screen
  const st = screenTranslations[settings.language] || screenTranslations.en;

  // Function to fetch reports from Firebase
  const fetchReports = async () => {
    setLoading(true);
    try {
      console.log("Fetching reports from Firebase...");
      const querySnapshot = await getDocs(collection(db, "Reports"));
      const reportsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const woodTypeMap: Record<string, string> = {
          graphite_walnut: st.graphiteWalnut,
          medium_cherry: st.mediumCherry,
          desert_oak: st.desertOak,
        };

        return {
          id: doc.id,
          date: formatDate(data.Date),
          rawDate: data.Date,
          accuracy: data.Accuracy,
          wood_type: woodTypeMap[data.Wood] || data.Wood,
          image: data.Image || null,
        };
      });

      const sortedReports = reportsData.sort(
        (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );

      setReports(sortedReports);
      setFilteredReports(sortedReports);
      console.log(`Fetched ${sortedReports.length} reports`);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use this effect to fetch reports on initial load and when language changes
  useEffect(() => {
    fetchReports();
  }, [settings.language, refreshKey]); // Add refreshKey to dependencies

  // Use this effect to refresh data whenever the screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log("Screen is focused, refreshing reports...");
      fetchReports();
      return () => {
        // This runs when the screen is unfocused
        console.log("Screen is unfocused");
      };
    }, [])
  );

  const generateMonths = () => {
    const translations = {
      en: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      es: [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ],
      fr: [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
      ],
      de: [
        "Januar",
        "Februar",
        "März",
        "April",
        "Mai",
        "Juni",
        "Juli",
        "August",
        "September",
        "Oktober",
        "November",
        "Dezember",
      ],
      zh: [
        "一月",
        "二月",
        "三月",
        "四月",
        "五月",
        "六月",
        "七月",
        "八月",
        "九月",
        "十月",
        "十一月",
        "十二月",
      ],
    };

    const monthNames = translations[settings.language] || translations.en;

    return [
      { label: st.allMonths, value: "" },
      ...monthNames.map((name, index) => ({
        label: name,
        value: String(index + 1),
      })),
    ];
  };

  const generateDays = () => [
    { label: st.allDays, value: "" },
    ...Array.from({ length: 31 }, (_, index) => ({
      label: String(index + 1),
      value: String(index + 1),
    })),
  ];

  const generateYears = () => [
    { label: st.allYears, value: "" },
    ...Array.from({ length: 10 }, (_, index) => ({
      label: String(new Date().getFullYear() - index),
      value: String(new Date().getFullYear() - index),
    })),
  ];

  const woodTypes = [st.all, st.graphiteWalnut, st.mediumCherry, st.desertOak];

  const shareReport = async (report: {
    wood_type: any;
    accuracy: any;
    date: any;
  }) => {
    const title = st.reportTitle;
    const content = st.reportContent
      .replace("{wood_type}", report.wood_type || "Unknown")
      .replace("{accuracy}", report.accuracy || "0")
      .replace("{date}", report.date);

    try {
      await Share.share({
        title,
        message: content,
      });
    } catch (error) {
      console.error(`${st.errorSharing} ${error}`);
    }
  };

  // Manual refresh function for pull-to-refresh or refresh button
  const refreshReports = () => {
    setRefreshKey((prevKey) => prevKey + 1); // Increment the refresh key to trigger a re-render
  };

  useEffect(() => {
    let filtered = reports;

    if (selectedMonth) {
      filtered = filtered.filter((report) => {
        const reportMonth = new Date(report.rawDate).getMonth() + 1;
        return reportMonth === Number(selectedMonth);
      });
    }

    if (selectedDay) {
      filtered = filtered.filter((report) => {
        const reportDay = new Date(report.rawDate).getDate();
        return reportDay === Number(selectedDay);
      });
    }

    if (selectedYear) {
      filtered = filtered.filter((report) => {
        const reportYear = new Date(report.rawDate).getFullYear();
        return reportYear === Number(selectedYear);
      });
    }

    // Create a mapping to handle localized wood type names
    const woodTypeToEnglish: Record<string, string> = {
      [st.graphiteWalnut]: "Graphite Walnut",
      [st.mediumCherry]: "Medium Cherry",
      [st.desertOak]: "Desert Oak",
    };

    const englishToDb: Record<string, string> = {
      "Graphite Walnut": "graphite_walnut",
      "Medium Cherry": "medium_cherry",
      "Desert Oak": "desert_oak",
    };

    if (selectedWoodType !== st.all) {
      // Get the English name if the selected wood type is localized
      const englishName =
        woodTypeToEnglish[selectedWoodType] || selectedWoodType;
      // Get the database value for filtering
      const dbValue = englishToDb[englishName] || englishName;

      filtered = filtered.filter(
        (report) =>
          report.wood_type === selectedWoodType ||
          report.wood_type === englishName ||
          report.wood_type === dbValue
      );
    }

    setFilteredReports(filtered);
  }, [
    selectedMonth,
    selectedDay,
    selectedYear,
    selectedWoodType,
    reports,
    st.all,
    st.graphiteWalnut,
    st.mediumCherry,
    st.desertOak,
  ]);

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
    filterCard: {
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
    sectionHeader: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    filters: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    pickerWrapper: {
      width: "48%",
      marginBottom: 15,
    },
    pickerLabel: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 5,
      fontWeight: "500",
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.darkMode ? "#222222" : "transparent",
    },
    picker: {
      height: Platform.OS === "ios" ? 120 : 50,
      width: "100%",
      marginTop: Platform.OS === "ios" ? -60 : 0,
      marginBottom: Platform.OS === "ios" ? 40 : 0,
    },
    pickerItem: {
      fontSize: 16,
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
      alignItems: "center",
      justifyContent: "center",
      minHeight: 200,
    },
    noResultsText: {
      fontSize: 17,
      color: colors.secondaryText,
      textAlign: "center",
    },
    reportsContainer: {
      width: "100%",
      marginTop: 10,
    },
    reportCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      width: "100%",
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 2,
    },
    reportRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    reportDate: {
      fontSize: 14,
      color: colors.text,
      flex: 2,
    },
    reportWoodType: {
      fontSize: 14,
      color: colors.text,
      flex: 2,
      textAlign: "center",
    },
    reportAccuracy: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.primary,
      flex: 1,
      textAlign: "right",
    },
    shareButton: {
      padding: 8,
    },
    refreshButton: {
      position: "absolute",
      right: 24,
      top: 12,
      padding: 8,
      zIndex: 1,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContainer}>
        <View style={dynamicStyles.container}>
          <TouchableOpacity
            style={dynamicStyles.refreshButton}
            onPress={refreshReports}
          >
            <Ionicons name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>

          <Text style={dynamicStyles.appTitle}>{st.appTitle}</Text>

          <View style={dynamicStyles.filterCard}>
            <Text style={dynamicStyles.sectionHeader}>{st.filterBy}</Text>
            <View style={dynamicStyles.filters}>
              <View style={dynamicStyles.pickerWrapper}>
                <Text style={dynamicStyles.pickerLabel}>{st.month}</Text>
                <View style={dynamicStyles.pickerContainer}>
                  <Picker
                    selectedValue={selectedMonth}
                    onValueChange={setSelectedMonth}
                    style={dynamicStyles.picker}
                    dropdownIconColor={colors.primary}
                    mode="dropdown"
                    itemStyle={dynamicStyles.pickerItem}
                  >
                    {generateMonths().map(({ label, value }) => (
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

              <View style={dynamicStyles.pickerWrapper}>
                <Text style={dynamicStyles.pickerLabel}>{st.day}</Text>
                <View style={dynamicStyles.pickerContainer}>
                  <Picker
                    selectedValue={selectedDay}
                    onValueChange={setSelectedDay}
                    style={dynamicStyles.picker}
                    dropdownIconColor={colors.primary}
                    mode="dropdown"
                    itemStyle={dynamicStyles.pickerItem}
                  >
                    {generateDays().map(({ label, value }) => (
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

              <View style={dynamicStyles.pickerWrapper}>
                <Text style={dynamicStyles.pickerLabel}>{st.year}</Text>
                <View style={dynamicStyles.pickerContainer}>
                  <Picker
                    selectedValue={selectedYear}
                    onValueChange={setSelectedYear}
                    style={dynamicStyles.picker}
                    dropdownIconColor={colors.primary}
                    mode="dropdown"
                    itemStyle={dynamicStyles.pickerItem}
                  >
                    {generateYears().map(({ label, value }) => (
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

              <View style={dynamicStyles.pickerWrapper}>
                <Text style={dynamicStyles.pickerLabel}>{st.woodType}</Text>
                <View style={dynamicStyles.pickerContainer}>
                  <Picker
                    selectedValue={selectedWoodType}
                    onValueChange={setSelectedWoodType}
                    style={dynamicStyles.picker}
                    dropdownIconColor={colors.primary}
                    mode="dropdown"
                    itemStyle={dynamicStyles.pickerItem}
                  >
                    {woodTypes.map((type) => (
                      <Picker.Item
                        key={type}
                        label={type}
                        value={type}
                        color={Platform.OS === "ios" ? colors.text : undefined}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={dynamicStyles.loaderContainer}>
              <Text style={dynamicStyles.loaderText}>{st.loadingReports}</Text>
            </View>
          ) : filteredReports.length === 0 ? (
            <View style={dynamicStyles.responseCard}>
              <Text style={dynamicStyles.noResultsText}>
                {st.noReportsMatch}
              </Text>
            </View>
          ) : (
            <View style={dynamicStyles.reportsContainer}>
              {filteredReports.map((report) => (
                <View key={report.id} style={dynamicStyles.reportCard}>
                  <View style={dynamicStyles.reportRow}>
                    <Text style={dynamicStyles.reportDate}>{report.date}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedImage(report.image); // `image` should be the downloadURL field
                        setModalVisible(true);
                      }}
                    >
                      <Text style={dynamicStyles.reportWoodType}>
                        {report.wood_type}
                      </Text>
                    </TouchableOpacity>
                    <Text style={dynamicStyles.reportAccuracy}>
                      {report.accuracy}
                    </Text>
                    <TouchableOpacity
                      style={dynamicStyles.shareButton}
                      onPress={() => shareReport(report)}
                    >
                      <Ionicons
                        name="share-outline"
                        size={24}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.7)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={{
                      position: "absolute",
                      top: 40,
                      right: 20,
                      zIndex: 1,
                    }}
                  >
                    <Ionicons name="close" size={32} color="#fff" />
                  </TouchableOpacity>

                  <Image
                    source={{ uri: selectedImage }}
                    style={{
                      width: 300,
                      height: 300,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: "#fff",
                    }}
                    resizeMode="contain"
                  />
                </View>
              </Modal>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Two;
