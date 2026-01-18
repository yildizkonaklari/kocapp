// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Arka planda bildirim gelince yapılacak işlem
messaging.onBackgroundMessage((payload) => {
  console.log('Arka plan bildirimi alındı:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/public/favicon.png' // Uygulama ikonunuzun yolu
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
