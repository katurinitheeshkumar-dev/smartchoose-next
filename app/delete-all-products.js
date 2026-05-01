import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FIREBASE_PROJECT_ID = 'smartchoose-official';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let app;
const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: FIREBASE_PROJECT_ID
  });
} else {
  console.error('❌ service-account.json not found! Cannot delete products safely.');
  process.exit(1);
}

const db = getFirestore(app);

async function deleteAllProducts() {
  console.log('📡 Fetching all products for deletion...');
  const snapshot = await db.collection('products').get();
  
  if (snapshot.empty) {
    console.log('✅ No products found to delete.');
    return;
  }

  console.log(`🧨 Found ${snapshot.size} products. Deleting in batches...`);
  
  const batchSize = 400;
  let deletedCount = 0;
  
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = snapshot.docs.slice(i, i + batchSize);
    
    chunk.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    deletedCount += chunk.length;
    console.log(`   - Deleted ${deletedCount}/${snapshot.size}...`);
  }

  console.log('✅ SUCCESS: All products deleted from Firestore!');
}

deleteAllProducts().catch(err => {
  console.error('❌ Error deleting products:', err);
  process.exit(1);
});
