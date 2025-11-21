
// This service worker file must be located in the public root directory.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Your web app's Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyAsAmByLvLqfFAKPiAeen0UJWdjT9MnTxQ",
  authDomain: "antamvieclam.firebaseapp.com",
  projectId: "antamvieclam",
  storageBucket: "antamvieclam.appspot.com",
  messagingSenderId: "221272132411",
  appId: "1:221272132411:web:83f7ab86a08823f3c8451e",
  measurementId: "G-2PT3C0KQWB"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Use onBackgroundMessage to handle messages when the app is in the background
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://an-tam-viec-lam-website.vercel.app/logo192.png' // Fallback icon if available
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
