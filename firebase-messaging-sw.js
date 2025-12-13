
// This service worker file must be located in the public root directory.

// Using compat libraries is a robust way to ensure Firebase works in the service worker context.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Your web app's Firebase configuration.
// This needs to be available to the service worker to initialize Firebase.
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

// This handler is triggered when a push notification is received while the app is in the background or closed.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize the notification that will be shown to the user.
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    // icon: '/path/to/icon.png' // Optional: Add an icon for the notification
  };

  // The showNotification method displays the notification on the user's device.
  self.registration.showNotification(notificationTitle, notificationOptions);
});
