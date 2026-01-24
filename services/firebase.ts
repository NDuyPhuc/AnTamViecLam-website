
// Access the global firebase namespace populated by the scripts in index.html
const firebase = (window as any).firebase;

if (!firebase) {
  console.error("Firebase SDK not loaded. Ensure Firebase scripts are included in index.html");
  throw new Error("Lỗi kết nối: Không thể tải thư viện Firebase. Vui lòng kiểm tra kết nối mạng và tải lại trang.");
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsAmByLvLqfFAKPiAeen0UJWdjT9MnTxQ",
  authDomain: "antamvieclam.firebaseapp.com",
  databaseURL: "https://antamvieclam-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "antamvieclam",
  storageBucket: "antamvieclam.firebasestorage.app",
  messagingSenderId: "221272132411",
  appId: "1:221272132411:web:83f7ab86a08823f3c8451e",
  measurementId: "G-2PT3C0KQWB"
};

// Initialize Firebase using the compat SDK
// Use firebase.apps.length check to prevent re-initialization error
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

export const auth = firebase.auth();
export const db = firebase.firestore();
export const messaging = firebase.messaging();
export const rtdb = firebase.database();

// Export compat firestore helpers
export const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;
export const arrayUnion = firebase.firestore.FieldValue.arrayUnion;
export const increment = firebase.firestore.FieldValue.increment;
