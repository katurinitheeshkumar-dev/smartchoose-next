import { initializeApp } from "firebase/app";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyDXgUU4_JoeraAgNAsHshXfI5KXvLqTkic",
    authDomain: "smartchoose-official.firebaseapp.com",
    projectId: "smartchoose-official",
    storageBucket: "smartchoose-official.firebasestorage.app",
    messagingSenderId: "523324606856",
    appId: "1:523324606856:web:50134b90e4dea65311523d",
    measurementId: "G-076YX1H464"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Fast Loading: Enable Offline Persistence
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistence failed: Browser not supported');
    }
  });
}

export const storage = getStorage(app);
export const auth = getAuth(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
