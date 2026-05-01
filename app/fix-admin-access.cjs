const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'smartchoose-official'
});

const db = getFirestore();
const auth = getAuth();

async function fixAdmin() {
  const email = 'smartchoose.app@gmail.com';
  console.log(`🔍 Checking user: ${email}...`);
  
  try {
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;
    console.log(`✅ User found! UID: ${uid}`);
    
    console.log(`🚀 Adding ${uid} to 'admins' collection...`);
    await db.collection('admins').doc(uid).set({
      email: email,
      role: 'super_admin',
      name: 'SmartChoose Admin',
      createdAt: new Date().toISOString()
    });
    
    console.log('✨ SUCCESS! Admin access granted.');
    console.log('   Now try logging in again on the website.');
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ ERROR: User ${email} does not exist in Firebase Auth.`);
      console.log('   Please create the user account first via the login screen if possible, or use the Firebase Console.');
    } else {
      console.error('❌ ERROR:', error);
    }
  }
}

fixAdmin();
