import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Share,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { Ionicons } from "@expo/vector-icons";

interface Report {
  id: string;
  accuracy: string;
  date: string;
  wood_type: string;
  rawDate: string;
}

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const generateMonths = () => [
  { label: "All Months", value: "" },
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const generateDays = () => [
  { label: "All Days", value: "" },
  ...Array.from({ length: 31 }, (_, index) => ({
    label: String(index + 1),
    value: String(index + 1),
  })),
];

const generateYears = () => [
  { label: "All Years", value: "" },
  ...Array.from({ length: 10 }, (_, index) => ({
    label: String(new Date().getFullYear() - index),
    value: String(new Date().getFullYear() - index),
  })),
];

const woodTypes = ["All", "Graphite Walnut", "Medium Cherry", "Desert Oak"];

const Two = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedWoodType, setSelectedWoodType] = useState<string>("All");

  const shareReport = async (report: {
    wood_type: any;
    accuracy: any;
    date: any;
  }) => {
    const title = "Wood Report Details";
    const content = `
    This is a detailed report of your wood analysis. The results are based on the image you provided.
    The analysis includes the classification of the wood type, confidence levels, and any specialized tests that were performed.
    
    Report Summary:
    - Wood Type: ${report.wood_type || "Unknown"}
    - Accuracy: ${report.accuracy || 0}%
    - Date: ${report.date}
  
    Please review the results carefully and let us know if you have any questions or need further assistance.
    `;

    try {
      await Share.share({
        title,
        message: content,
      });
    } catch (error) {
      console.error("Error sharing report:", error);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Reports"));
        const reportsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const woodTypeMap: Record<string, string> = {
            graphite_walnut: "Graphite Walnut",
            medium_cherry: "Medium Cherry",
            desert_oak: "Desert Oak",
          };

          return {
            id: doc.id,
            date: formatDate(data.Date),
            rawDate: data.Date,
            accuracy: parseFloat(data.Accuracy).toFixed(1),
            wood_type: woodTypeMap[data.Wood] || data.Wood,
          };
        });

        const sortedReports = reportsData.sort(
          (a, b) =>
            new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
        );

        setReports(sortedReports);
        setFilteredReports(sortedReports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

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

    const woodTypeMap: Record<string, string> = {
      "Graphite Walnut": "graphite_walnut",
      "Medium Cherry": "medium_cherry",
      "Desert Oak": "desert_oak",
    };

    if (selectedWoodType !== "All") {
      const originalWoodType =
        woodTypeMap[selectedWoodType] || selectedWoodType;
      filtered = filtered.filter(
        (report) =>
          report.wood_type === selectedWoodType ||
          report.wood_type === originalWoodType
      );
    }

    setFilteredReports(filtered);
  }, [selectedMonth, selectedDay, selectedYear, selectedWoodType, reports]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.appTitle}>Wood Identification Reports</Text>

          <View style={styles.filterCard}>
            <Text style={styles.sectionHeader}>Filter by:</Text>
            <View style={styles.filters}>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Month</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedMonth}
                    onValueChange={setSelectedMonth}
                    style={styles.picker}
                    dropdownIconColor="#8A3FFC"
                    mode="dropdown"
                    itemStyle={styles.pickerItem}
                  >
                    {generateMonths().map(({ label, value }) => (
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

              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Day</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedDay}
                    onValueChange={setSelectedDay}
                    style={styles.picker}
                    dropdownIconColor="#8A3FFC"
                    mode="dropdown"
                    itemStyle={styles.pickerItem}
                  >
                    {generateDays().map(({ label, value }) => (
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

              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Year</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedYear}
                    onValueChange={setSelectedYear}
                    style={styles.picker}
                    dropdownIconColor="#8A3FFC"
                    mode="dropdown"
                    itemStyle={styles.pickerItem}
                  >
                    {generateYears().map(({ label, value }) => (
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

              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Wood Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedWoodType}
                    onValueChange={setSelectedWoodType}
                    style={styles.picker}
                    dropdownIconColor="#8A3FFC"
                    mode="dropdown"
                    itemStyle={styles.pickerItem}
                  >
                    {woodTypes.map((type) => (
                      <Picker.Item
                        key={type}
                        label={type}
                        value={type}
                        color={Platform.OS === "ios" ? "#35343D" : undefined}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <Text style={styles.loaderText}>Loading reports...</Text>
            </View>
          ) : filteredReports.length === 0 ? (
            <View style={styles.responseCard}>
              <Text style={styles.noResultsText}>
                No reports match your filters
              </Text>
            </View>
          ) : (
            <View style={styles.reportsContainer}>
              {filteredReports.map((report) => (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportRow}>
                    <Text style={styles.reportDate}>{report.date}</Text>
                    <Text style={styles.reportWoodType}>
                      {report.wood_type}
                    </Text>
                    <Text style={styles.reportAccuracy}>
                      {report.accuracy}%
                    </Text>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => shareReport(report)}
                    >
                      <Ionicons
                        name="share-outline"
                        size={24}
                        color="#8A3FFC"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  filterCard: {
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
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#35343D",
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
    color: "#35343D",
    marginBottom: 5,
    fontWeight: "500",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D9D9E3",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: Platform.OS === "ios" ? 120 : 50,
    width: "100%",
    color: "#35343D",
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
    color: "#8A3FFC",
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
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  noResultsText: {
    fontSize: 17,
    color: "#666",
    textAlign: "center",
  },
  reportsContainer: {
    width: "100%",
    marginTop: 10,
  },
  reportCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportDate: {
    fontSize: 15,
    color: "#35343D",
    flex: 2,
  },
  reportWoodType: {
    fontSize: 15,
    color: "#35343D",
    flex: 2,
    textAlign: "center",
  },
  reportAccuracy: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#8A3FFC",
    flex: 1,
    textAlign: "right",
  },
  shareButton: {
    padding: 8,
  },
});

export default Two;
