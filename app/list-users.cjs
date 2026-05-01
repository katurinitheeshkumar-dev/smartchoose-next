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

async function listUsers() {
  console.log('📡 Fetching all users and admin status...');
  
  try {
    const listUsersResult = await auth.listUsers();
    const adminsSnap = await db.collection('admins').get();
    const adminUids = new Set(adminsSnap.docs.map(doc => doc.id));
    
    console.log('\n--- Auth Users ---');
    for (const user of listUsersResult.users) {
      const isAdmin = adminUids.has(user.uid);
      console.log(`- Email: ${user.email.padEnd(30)} | UID: ${user.uid} | Admin: ${isAdmin ? '✅ YES' : '❌ NO'}`);
    }
    
    console.log('\n--- Firestore Admins Collection ---');
    adminsSnap.forEach(doc => {
      console.log(`- ID: ${doc.id} | Data: ${JSON.stringify(doc.data())}`);
    });

  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

listUsers();
