// Fix: Use named imports for Firebase v9+ modular SDK.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsAmByLvLqfFAKPiAeen0UJWdjT9MnTxQ",
  authDomain: "antamvieclam.firebaseapp.com",
  projectId: "antamvieclam",
  storageBucket: "antamvieclam.appspot.com",
  messagingSenderId: "221272132411",
  appId: "1:221272132411:web:83f7ab86a08823f3c8451e",
  measurementId: "G-2PT3C0KQWB",
  databaseURL: "https://antamvieclam-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase using the modular SDK
// This ensures that the app instance is compatible with modular functions like getFirestore()
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const rtdb = getDatabase(app);