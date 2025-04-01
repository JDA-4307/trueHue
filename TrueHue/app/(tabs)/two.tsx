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
  { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
  { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
  { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
  { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 }
];

const generateDays = () => Array.from({ length: 31 }, (_, index) => index + 1);
const generateYears = () => Array.from({ length: 10 }, (_, index) => new Date().getFullYear() - index);

const woodTypes = ['All', 'Graphite Walnut', 'Medium Cherry', 'Desert Oak'];

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
          const woodTypeMap: Record<string, string> = {
            'graphite_walnut': 'Graphite Walnut',
            'medium_cherry': 'Medium Cherry',
            'desert_oak': 'Desert Oak'
          };
          
          return {
            id: doc.id,
            date: formatDate(data.Date),
            rawDate: data.Date,
            accuracy: parseFloat(data.Accuracy).toFixed(1),
            wood_type: woodTypeMap[data.Wood] || data.Wood,
          };
        });
        
        const sortedReports = reportsData.sort((a, b) => 
          new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
        );
        
        setReports(sortedReports);
        setFilteredReports(sortedReports);
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
    
    if (selectedMonth !== null) {
      filtered = filtered.filter(report => new Date(report.rawDate).getMonth() + 1 === Number(selectedMonth));
    }

    if (selectedDay !== null) {
      filtered = filtered.filter(report => new Date(report.rawDate).getDate() === Number(selectedDay));
    }

    if (selectedYear !== null) {
      filtered = filtered.filter(report => new Date(report.rawDate).getFullYear() === Number(selectedYear));
    }

    const woodTypeMap: Record<string, string> = {
      'Graphite Walnut': 'graphite_walnut',
      'Medium Cherry': 'medium_cherry',
      'Desert Oak': 'desert_oak'
    };
    
    if (selectedWoodType !== 'All') {
      const originalWoodType = woodTypeMap[selectedWoodType] || selectedWoodType;
      filtered = filtered.filter(report => 
        report.wood_type === selectedWoodType || 
        report.wood_type === originalWoodType
      );
    }
    
    setFilteredReports(filtered);
  }, [selectedMonth, selectedDay, selectedYear, selectedWoodType, reports]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wood Identification Reports</Text>
      
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Filter by:</Text>
        <View style={styles.filters}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Month</Text>
            <Picker 
              selectedValue={selectedMonth} 
              onValueChange={setSelectedMonth}
              style={styles.picker}
              dropdownIconColor="#666"
            >
              <Picker.Item label="All Months" value={null} />
              {generateMonths().map(({ label, value }) => 
                <Picker.Item key={value} label={label} value={value} />
              )}
            </Picker>
          </View>
          
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Day</Text>
            <Picker 
              selectedValue={selectedDay} 
              onValueChange={setSelectedDay}
              style={styles.picker}
              dropdownIconColor="#666"
            >
              <Picker.Item label="All Days" value={null} />
              {generateDays().map(day => 
                <Picker.Item key={day} label={String(day)} value={day} />
              )}
            </Picker>
          </View>
          
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Year</Text>
            <Picker 
              selectedValue={selectedYear} 
              onValueChange={setSelectedYear}
              style={styles.picker}
              dropdownIconColor="#666"
            >
              <Picker.Item label="All Years" value={null} />
              {generateYears().map(year => 
                <Picker.Item key={year} label={String(year)} value={year} />
              )}
            </Picker>
          </View>
          
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Wood Type</Text>
            <Picker 
              selectedValue={selectedWoodType} 
              onValueChange={setSelectedWoodType}
              style={styles.picker}
              dropdownIconColor="#666"
            >
              {woodTypes.map(type => 
                <Picker.Item key={type} label={type} value={type} />
              )}
            </Picker>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No reports match your filters</Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.dateHeader]}>Date</Text>
            <Text style={[styles.headerCell, styles.accuracyHeader]}>Accuracy</Text>
            <Text style={[styles.headerCell, styles.typeHeader]}>Wood Type</Text>
          </View>
          <ScrollView style={styles.tableBody}>
            {filteredReports.map((report) => (
              <View key={report.id} style={styles.tableRow}>
                <Text style={[styles.cell, styles.dateCell]}>{report.date}</Text>
                <Text style={[styles.cell, styles.accuracyCell]}>{report.accuracy}%</Text>
                <Text style={[styles.cell, styles.typeCell]}>{report.wood_type}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default Two;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  filtersContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pickerContainer: {
    width: '48%',
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  picker: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2c3e50',
    paddingVertical: 12,
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dateHeader: {
    flex: 2,
    paddingLeft: 15,
    textAlign: 'left',
  },
  accuracyHeader: {
    flex: 1,
  },
  typeHeader: {
    flex: 2,
    paddingRight: 15,
    textAlign: 'right',
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  cell: {
    fontSize: 14,
    color: '#333',
  },
  dateCell: {
    flex: 2,
    paddingLeft: 15,
  },
  accuracyCell: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  typeCell: {
    flex: 2,
    paddingRight: 15,
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});