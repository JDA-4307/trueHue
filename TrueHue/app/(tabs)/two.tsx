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
        const querySnapshot = await getDocs(collection(db, "Reports"));
        const reportsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Report[];

        setReports(reportsData);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
    console.log(reports);
  }, []);

  return (
    <div className="p-4">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {reports.map((report) => (
            <li key={report.id} className="border p-3 my-2 rounded shadow">
              <p><strong>Date:</strong> {report.date}</p>
              <p><strong>Accuracy:</strong> {report.accuracy}%</p>
              <p><strong>Wood Type:</strong> {report.wood_type}</p>
            </li>
          ))}
        </ul>
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
});
