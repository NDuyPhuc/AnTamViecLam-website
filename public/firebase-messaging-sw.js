
/* eslint-disable no-undef */
// File này phải nằm trong thư mục public để được truy cập trực tiếp từ trình duyệt

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png' // Icon ứng dụng (nếu có)
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
