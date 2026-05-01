import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

let db;
let messaging;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK Initialized');
  }

  db = getFirestore();
  messaging = getMessaging();
} catch (error) {
  console.error('❌ Firebase Admin SDK Initialization Error:', error.message);
}

export { db, messaging };
