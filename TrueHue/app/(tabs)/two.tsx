import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
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
  { label: 'All Months', value: '' },
  { label: 'January', value: '1' }, { label: 'February', value: '2' }, 
  { label: 'March', value: '3' }, { label: 'April', value: '4' }, 
  { label: 'May', value: '5' }, { label: 'June', value: '6' },
  { label: 'July', value: '7' }, { label: 'August', value: '8' }, 
  { label: 'September', value: '9' }, { label: 'October', value: '10' }, 
  { label: 'November', value: '11' }, { label: 'December', value: '12' }
];

const generateDays = () => [
  { label: 'All Days', value: '' },
  ...Array.from({ length: 31 }, (_, index) => ({
    label: String(index + 1),
    value: String(index + 1)
  }))
];

const generateYears = () => [
  { label: 'All Years', value: '' },
  ...Array.from({ length: 10 }, (_, index) => ({
    label: String(new Date().getFullYear() - index),
    value: String(new Date().getFullYear() - index)
  }))
];

const woodTypes = ['All', 'Graphite Walnut', 'Medium Cherry', 'Desert Oak'];

const Two = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
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
    
    if (selectedMonth) {
      filtered = filtered.filter(report => {
        const reportMonth = new Date(report.rawDate).getMonth() + 1;
        return reportMonth === Number(selectedMonth);
      });
    }

    if (selectedDay) {
      filtered = filtered.filter(report => {
        const reportDay = new Date(report.rawDate).getDate();
        return reportDay === Number(selectedDay);
      });
    }

    if (selectedYear) {
      filtered = filtered.filter(report => {
        const reportYear = new Date(report.rawDate).getFullYear();
        return reportYear === Number(selectedYear);
      });
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
          <View style={styles.pickerWrapper}>
            <Text style={styles.pickerLabel}>Month</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={setSelectedMonth}
                style={styles.picker}
                dropdownIconColor="#2c3e50"
                mode="dropdown"
                itemStyle={styles.pickerItem}
              >
                {generateMonths().map(({ label, value }) => (
                  <Picker.Item 
                    key={value} 
                    label={label} 
                    value={value} 
                    color={Platform.OS === 'ios' ? '#2c3e50' : undefined}
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
                dropdownIconColor="#2c3e50"
                mode="dropdown"
                itemStyle={styles.pickerItem}
              >
                {generateDays().map(({ label, value }) => (
                  <Picker.Item 
                    key={value} 
                    label={label} 
                    value={value} 
                    color={Platform.OS === 'ios' ? '#2c3e50' : undefined}
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
                dropdownIconColor="#2c3e50"
                mode="dropdown"
                itemStyle={styles.pickerItem}
              >
                {generateYears().map(({ label, value }) => (
                  <Picker.Item 
                    key={value} 
                    label={label} 
                    value={value} 
                    color={Platform.OS === 'ios' ? '#2c3e50' : undefined}
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
                dropdownIconColor="#2c3e50"
                mode="dropdown"
                itemStyle={styles.pickerItem}
              >
                {woodTypes.map(type => (
                  <Picker.Item 
                    key={type} 
                    label={type} 
                    value={type} 
                    color={Platform.OS === 'ios' ? '#2c3e50' : undefined}
                  />
                ))}
              </Picker>
            </View>
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
        <ScrollView style={styles.reportsContainer}>
          {filteredReports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportRow}>
                <Text style={styles.reportDate}>{report.date}</Text>
                <Text style={styles.reportWoodType}>{report.wood_type}</Text>
                <Text style={styles.reportAccuracy}>{report.accuracy}%</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
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
    color: '#2c3e50',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pickerWrapper: {
    width: '48%',
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 5,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',

  },
  picker: {
    height: Platform.OS === 'ios' ? 120 : 50,
    width: '100%',
    color: '#2c3e50',
    marginTop: Platform.OS === 'ios' ? -60 : 0,
    marginBottom: Platform.OS === 'ios' ? 40 : 0  ,
  },
  pickerItem: {
    fontSize: 16,
  },
  reportsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportDate: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 2,
  },
  reportWoodType: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 2,
    textAlign: 'center',
  },
  reportAccuracy: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    flex: 1,
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

export default Two;