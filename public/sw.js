
/* eslint-disable no-undef */
// This service worker file must be located in the public directory to be served at the root path.

// Using compat libraries is a robust way to ensure Firebase works in the service worker context.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Your web app's Firebase configuration.
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

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This handler is triggered when a push notification is received while the app is in the background or closed.
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png' // Optional icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
