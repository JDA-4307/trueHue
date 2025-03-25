import { StyleSheet, Button, Alert } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';


import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

interface Report {
  id: string;
  accuracy: string;
  date: string;
  wood_type: string;
}

const Two = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        console.log("Fetching reports...");
        const querySnapshot = await getDocs(collection(db, "Reports"));
  
        if (querySnapshot.empty) {
          console.log("No reports found.");
        }
  
        const reportsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.Date,
            accuracy: data.Accuracy,
            wood_type: data.Wood,
          };
        });
  
        console.log("Fetched Reports:", reportsData);
        setReports(reportsData);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchReports();
  }, []);
  

  return (
    <div className="p-4">
      {loading ? (
        <p>Loading...</p>
      ) : reports.length === 0 ? (
        <p>No reports available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border p-4 rounded-lg shadow-md flex flex-col items-center bg-white"
            >
              <p><strong>Date:</strong> {report.date}</p>
              <p><strong>Accuracy:</strong> {report.accuracy}%</p>
              <p><strong>Wood Type:</strong> {report.wood_type}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Two;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  grid_container: {
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 20,
  },
});
