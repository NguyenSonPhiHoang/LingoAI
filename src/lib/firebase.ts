// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "lingoai-o5x43",
  appId: "1:189734115506:web:c31d51b2adf3af04e651ab",
  storageBucket: "lingoai-o5x43.firebasestorage.app",
  apiKey: "AIzaSyCjK9z712iW9IZq7b9WplWHqfEeARDlqSY",
  authDomain: "lingoai-o5x43.firebaseapp.com",
  messagingSenderId: "189734115506",
};

// Feature flag: allow disabling Firebase usage entirely to avoid permission errors
export const firebaseEnabled =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_ENABLE_FIREBASE === "true";

// Initialize Firebase only when enabled
const app =
  firebaseEnabled && !getApps().length
    ? initializeApp(firebaseConfig)
    : firebaseEnabled
    ? getApp()
    : null;

// When disabled, we export typed nulls so callers can guard on firebaseEnabled
const db = (firebaseEnabled && app ? getFirestore(app) : null) as any;
const auth = (firebaseEnabled && app ? getAuth(app) : null) as any;

export { db, auth };
