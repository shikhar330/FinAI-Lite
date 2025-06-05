
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Added Firestore
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// IMPORTANT: Replace these with your actual Firebase project configuration!
const firebaseConfig = {
  apiKey: "AIzaSyCArNRwu-iR94ZLRHASxoklXyqBQB3v5mY",
  authDomain: "finai-lite-pphy2.firebaseapp.com",
  projectId: "finai-lite-pphy2",
  storageBucket: "finai-lite-pphy2.firebasestorage.app",
  messagingSenderId: "847930848885",
  appId: "1:847930848885:web:f41f5cb74494e97e9eaa3c"
}

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app); // Added Firestore instance

export { app, auth, db }; // Export db
