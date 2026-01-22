
// Use side-effect imports for CDN compat scripts (which don't provide default exports)
import 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/firestore';
import 'firebase/compat/messaging';

// Access the global firebase namespace populated by the scripts
const firebase = (window as any).firebase;

if (typeof firebase === 'undefined') {
  console.error("Firebase SDK not loaded. Check your internet connection or CDN configuration.");
}

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

// Initialize Firebase using the compat SDK
// Use firebase.apps.length check to prevent re-initialization error
const app = firebase && !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase?.app();

export const auth = firebase?.auth();
export const db = firebase?.firestore();
export const messaging = firebase?.messaging();
export const rtdb = firebase?.database();

// Export compat firestore helpers
export const serverTimestamp = firebase?.firestore.FieldValue.serverTimestamp;
export const arrayUnion = firebase?.firestore.FieldValue.arrayUnion;
export const increment = firebase?.firestore.FieldValue.increment;
