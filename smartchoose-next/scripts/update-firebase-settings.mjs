// Firebase Settings Update Script
// Run: node scripts/update-firebase-settings.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDXgUU4_JoeraAgNAsHshXfI5KXvLqTkic",
  authDomain: "smartchoose-official.firebaseapp.com",
  projectId: "smartchoose-official",
  storageBucket: "smartchoose-official.firebasestorage.app",
  messagingSenderId: "523324606856",
  appId: "1:523324606856:web:50134b90e4dea65311523d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CORRECT_SETTINGS = {
  // ✅ Contact Info
  phone: "+91 9247942311",
  email: "smartchoose.app@gmail.com",
  contactEmail: "smartchoose.app@gmail.com",
  contactPhone: "+91 9247942311",
  address: "10-19 Kotha Colony, Dharmavaram, Kovvur, East Godavari - 534340, Andhra Pradesh, India",
  contactAddress: "10-19 Kotha Colony, Dharmavaram, Kovvur, East Godavari - 534340, Andhra Pradesh, India",

  // ✅ Footer (fix 2024 → 2025)
  footerContent: "© 2025 SmartChoose. All rights reserved. Your trusted product discovery partner.",

  // ✅ Site info
  siteName: "SmartChoose",
  siteUrl: "https://smartchoose.in",
};

async function updateSettings() {
  try {
    console.log("🔄 Connecting to Firebase...");
    
    // Try common document paths for settings
    const paths = [
      { collection: 'settings', doc: 'site_settings' },
    ];

    let updated = false;
    
    for (const path of paths) {
      const ref = doc(db, path.collection, path.doc);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        console.log(`✅ Found settings at: ${path.collection}/${path.doc}`);
        const existing = snap.data();
        console.log("📋 Current footerContent:", existing.footerContent);
        console.log("📋 Current email:", existing.email);
        
        await setDoc(ref, { ...existing, ...CORRECT_SETTINGS }, { merge: true });
        console.log("✅ Settings updated successfully!");
        console.log("📋 New footerContent: © 2025 SmartChoose...");
        console.log("📋 New email: smartchoose.app@gmail.com");
        console.log("📋 New address: 10-19 Kotha Colony, Dharmavaram, Kovvur, East Godavari...");
        updated = true;
        break;
      }
    }

    if (!updated) {
      console.log("⚠️  Could not find settings document. Trying to list available collections...");
      console.log("Please manually update these fields in Firebase Console or Admin Dashboard:");
      console.log(JSON.stringify(CORRECT_SETTINGS, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

updateSettings();
