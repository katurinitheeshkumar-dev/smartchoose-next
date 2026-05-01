// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDXgUU4_JoeraAgNAsHshXfI5KXvLqTkic",
    authDomain: "smartchoose-official.firebaseapp.com",
    projectId: "smartchoose-official",
    storageBucket: "smartchoose-official.firebasestorage.app",
    messagingSenderId: "523324606856",
    appId: "1:523324606856:web:50134b90e4dea65311523d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
