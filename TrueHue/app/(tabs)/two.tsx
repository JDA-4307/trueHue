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
import { useSettings, translations, getThemeColors } from "./index";

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

const Two = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedWoodType, setSelectedWoodType] = useState<string>("All");

  // Get settings from context
  const { settings } = useSettings();

  // Get translations for current language
  const t = translations[settings.language] || translations.en;

  // Get theme colors
  const colors = getThemeColors(settings.darkMode, settings.highContrast);

  // Create translations for this screen
  const screenTranslations = {
    en: {
      appTitle: "Wood Identification Reports",
      filterBy: "Filter by:",
      month: "Month",
      day: "Day",
      year: "Year",
      woodType: "Wood Type",
      allMonths: "All Months",
      allDays: "All Days",
      allYears: "All Years",
      all: "All",
      graphiteWalnut: "Graphite Walnut",
      mediumCherry: "Medium Cherry",
      desertOak: "Desert Oak",
      loadingReports: "Loading reports...",
      noReportsMatch: "No reports match your filters",
      reportTitle: "Wood Report Details",
      reportContent:
        "This is a detailed report of your wood analysis. The results are based on the image you provided.\nThe analysis includes the classification of the wood type, confidence levels, and any specialized tests that were performed.\n\nReport Summary:\n- Wood Type: {wood_type}\n- Accuracy: {accuracy}%\n- Date: {date}\n\nPlease review the results carefully and let us know if you have any questions or need further assistance.",
      errorSharing: "Error sharing report:",
    },
    es: {
      appTitle: "Informes de Identificación de Madera",
      filterBy: "Filtrar por:",
      month: "Mes",
      day: "Día",
      year: "Año",
      woodType: "Tipo de Madera",
      allMonths: "Todos los Meses",
      allDays: "Todos los Días",
      allYears: "Todos los Años",
      all: "Todos",
      graphiteWalnut: "Nogal Grafito",
      mediumCherry: "Cerezo Medio",
      desertOak: "Roble Desierto",
      loadingReports: "Cargando informes...",
      noReportsMatch: "Ningún informe coincide con tus filtros",
      reportTitle: "Detalles del Informe de Madera",
      reportContent:
        "Este es un informe detallado de su análisis de madera. Los resultados se basan en la imagen que proporcionó.\nEl análisis incluye la clasificación del tipo de madera, niveles de confianza y cualquier prueba especializada que se haya realizado.\n\nResumen del Informe:\n- Tipo de Madera: {wood_type}\n- Precisión: {accuracy}%\n- Fecha: {date}\n\nPor favor revise los resultados cuidadosamente y háganos saber si tiene alguna pregunta o necesita asistencia adicional.",
      errorSharing: "Error al compartir informe:",
    },
    fr: {
      appTitle: "Rapports d'Identification du Bois",
      filterBy: "Filtrer par:",
      month: "Mois",
      day: "Jour",
      year: "Année",
      woodType: "Type de Bois",
      allMonths: "Tous les Mois",
      allDays: "Tous les Jours",
      allYears: "Toutes les Années",
      all: "Tous",
      graphiteWalnut: "Noyer Graphite",
      mediumCherry: "Cerisier Moyen",
      desertOak: "Chêne Désert",
      loadingReports: "Chargement des rapports...",
      noReportsMatch: "Aucun rapport ne correspond à vos filtres",
      reportTitle: "Détails du Rapport de Bois",
      reportContent:
        "Voici un rapport détaillé de votre analyse de bois. Les résultats sont basés sur l'image que vous avez fournie.\nL'analyse comprend la classification du type de bois, les niveaux de confiance et tous les tests spécialisés qui ont été effectués.\n\nRésumé du Rapport:\n- Type de Bois: {wood_type}\n- Précision: {accuracy}%\n- Date: {date}\n\nVeuillez examiner attentivement les résultats et nous faire savoir si vous avez des questions ou besoin d'une assistance supplémentaire.",
      errorSharing: "Erreur lors du partage du rapport:",
    },
    de: {
      appTitle: "Holzidentifikationsberichte",
      filterBy: "Filtern nach:",
      month: "Monat",
      day: "Tag",
      year: "Jahr",
      woodType: "Holzart",
      allMonths: "Alle Monate",
      allDays: "Alle Tage",
      allYears: "Alle Jahre",
      all: "Alle",
      graphiteWalnut: "Graphit-Walnuss",
      mediumCherry: "Mittlere Kirsche",
      desertOak: "Wüsteneiche",
      loadingReports: "Berichte werden geladen...",
      noReportsMatch: "Keine Berichte entsprechen Ihren Filtern",
      reportTitle: "Holzbericht Details",
      reportContent:
        "Dies ist ein detaillierter Bericht Ihrer Holzanalyse. Die Ergebnisse basieren auf dem von Ihnen bereitgestellten Bild.\nDie Analyse umfasst die Klassifizierung der Holzart, Konfidenzniveaus und alle durchgeführten spezialisierten Tests.\n\nBerichtszusammenfassung:\n- Holzart: {wood_type}\n- Genauigkeit: {accuracy}%\n- Datum: {date}\n\nBitte überprüfen Sie die Ergebnisse sorgfältig und lassen Sie uns wissen, wenn Sie Fragen haben oder weitere Unterstützung benötigen.",
      errorSharing: "Fehler beim Teilen des Berichts:",
    },
    zh: {
      appTitle: "木材识别报告",
      filterBy: "筛选条件:",
      month: "月份",
      day: "日期",
      year: "年份",
      woodType: "木材类型",
      allMonths: "所有月份",
      allDays: "所有日期",
      allYears: "所有年份",
      all: "全部",
      graphiteWalnut: "石墨胡桃木",
      mediumCherry: "中等樱桃木",
      desertOak: "沙漠橡木",
      loadingReports: "正在加载报告...",
      noReportsMatch: "没有匹配您筛选条件的报告",
      reportTitle: "木材报告详情",
      reportContent:
        "这是您的木材分析的详细报告。结果基于您提供的图像。\n分析包括木材类型的分类、置信度以及进行的任何专业测试。\n\n报告摘要:\n- 木材类型: {wood_type}\n- 准确度: {accuracy}%\n- 日期: {date}\n\n请仔细查看结果，如有任何问题或需要进一步帮助，请告知我们。",
      errorSharing: "分享报告时出错:",
    },
  };

  // Get translations for this screen
  const st = screenTranslations[settings.language] || screenTranslations.en;

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

  useEffect(() => {
    const fetchReports = async () => {
      try {
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
  }, [settings.language]); // Refetch when language changes to update translations

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
      color: colors.text,
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
      color: colors.text,
      flex: 2,
    },
    reportWoodType: {
      fontSize: 15,
      color: colors.text,
      flex: 2,
      textAlign: "center",
    },
    reportAccuracy: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.primary,
      flex: 1,
      textAlign: "right",
    },
    shareButton: {
      padding: 8,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContainer}>
        <View style={dynamicStyles.container}>
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
                    <Text style={dynamicStyles.reportWoodType}>
                      {report.wood_type}
                    </Text>
                    <Text style={dynamicStyles.reportAccuracy}>
                      {report.accuracy}%
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
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Two;
