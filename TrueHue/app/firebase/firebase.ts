// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA0EqeGBEsiQXmRw4hL6mT49SWj0-jGb5c",
  authDomain: "colorvalidation.firebaseapp.com",
  projectId: "colorvalidation",
  storageBucket: "colorvalidation.firebasestorage.app",
  messagingSenderId: "564628036503",
  appId: "1:564628036503:web:2e03fc06e4da0eac25c2d2",
  measurementId: "G-SWJJSNVF8S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);