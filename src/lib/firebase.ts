// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "lingoai-o5x43",
  "appId": "1:189734115506:web:c31d51b2adf3af04e651ab",
  "storageBucket": "lingoai-o5x43.firebasestorage.app",
  "apiKey": "AIzaSyCjK9z712iW9IZq7b9WplWHqfEeARDlqSY",
  "authDomain": "lingoai-o5x43.firebaseapp.com",
  "messagingSenderId": "189734115506"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
