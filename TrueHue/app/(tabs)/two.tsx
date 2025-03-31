import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

interface Report {
  id: string;
  accuracy: string;
  date: string;
  wood_type: string;
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
  { label: 'Jan', value: 1 }, { label: 'Feb', value: 2 }, { label: 'Mar', value: 3 },
  { label: 'Apr', value: 4 }, { label: 'May', value: 5 }, { label: 'Jun', value: 6 },
  { label: 'Jul', value: 7 }, { label: 'Aug', value: 8 }, { label: 'Sep', value: 9 },
  { label: 'Oct', value: 10 }, { label: 'Nov', value: 11 }, { label: 'Dec', value: 12 }
];

const generateDays = () => Array.from({ length: 31 }, (_, index) => index + 1);
const generateYears = () => Array.from({ length: 10 }, (_, index) => new Date().getFullYear() - index);

const woodTypes = ['All', 'graphite_walnut', 'medium_cherry', 'desert_oak'];

const Two = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedWoodType, setSelectedWoodType] = useState<string>('All');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'Reports'));
        const reportsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            date: formatDate(data.Date),
            accuracy: parseFloat(data.Accuracy).toFixed(1),
            wood_type: data.Wood,
          };
        });
        setReports(reportsData);
        setFilteredReports(reportsData);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  useEffect(() => {
    let filtered = reports;
    
    // Apply month filter only if selectedMonth is not null
    if (selectedMonth !== null) {
      filtered = filtered.filter(report => new Date(report.date).getMonth() + 1 === Number(selectedMonth));
    }

    // Apply day filter only if selectedDay is not null
    if (selectedDay !== null) {
      filtered = filtered.filter(report => new Date(report.date).getDate() === Number(selectedDay));
    }

    // Apply year filter only if selectedYear is not null
    if (selectedYear !== null) {
      filtered = filtered.filter(report => new Date(report.date).getFullYear() === Number(selectedYear));
    }

    // Apply woodType filter only if selectedWoodType is not 'All'
    if (selectedWoodType !== 'All') {
      filtered = filtered.filter(report => report.wood_type === selectedWoodType);
    }
    
    setFilteredReports(filtered);
  }, [selectedMonth, selectedDay, selectedYear, selectedWoodType, reports]);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <Picker selectedValue={selectedMonth} onValueChange={setSelectedMonth}>
          <Picker.Item label="Month" value={null} />
          {generateMonths().map(({ label, value }) => <Picker.Item key={value} label={label} value={value} />)}
        </Picker>
        <Picker selectedValue={selectedDay} onValueChange={setSelectedDay}>
          <Picker.Item label="Day" value={null} />
          {generateDays().map(day => <Picker.Item key={day} label={String(day)} value={day} />)}
        </Picker>
        <Picker selectedValue={selectedYear} onValueChange={setSelectedYear}>
          <Picker.Item label="Year" value={null} />
          {generateYears().map(year => <Picker.Item key={year} label={String(year)} value={year} />)}
        </Picker>
        <Picker selectedValue={selectedWoodType} onValueChange={setSelectedWoodType}>
          {woodTypes.map(type => <Picker.Item key={type} label={type} value={type} />)}
        </Picker>
      </View>

      {loading ? (
        <Text>Loading...</Text>
      ) : filteredReports.length === 0 ? (
        <Text>No reports available.</Text>
      ) : (
        <ScrollView horizontal contentContainerStyle={styles.gridContainer}>
          <View style={styles.row}>
            <Text style={styles.header}>Date</Text>
            <Text style={styles.header}>Accuracy</Text>
            <Text style={styles.header}>Wood Type</Text>
          </View>
          {filteredReports.map((report) => (
            <View key={report.id} style={styles.row}>
              <Text style={styles.cell}>{report.date}</Text>
              <Text style={styles.cell}>{report.accuracy}%</Text>
              <Text style={styles.cell}>{report.wood_type}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default Two;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10 },
  filters: { flexDirection: 'row', marginBottom: 10 },
  gridContainer: { flexDirection: 'column', alignItems: 'center', paddingBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  header: { fontWeight: 'bold', fontSize: 16, flex: 1, textAlign: 'center' },
  cell: { fontSize: 14, flex: 1, textAlign: 'center' },
});