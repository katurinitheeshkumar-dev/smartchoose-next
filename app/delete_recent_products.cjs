const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load service account
const serviceAccountPath = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ service-account.json not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteRecentProducts(count = 40) {
  console.log(`📡 Fetching the latest ${count} products...`);
  
  try {
    const snapshot = await db.collection('products')
      .orderBy('createdAt', 'desc')
      .limit(count)
      .get();

    if (snapshot.empty) {
      console.log('⚠️ No products found.');
      return;
    }

    console.log(`✅ Found ${snapshot.size} products. Deleting now...`);

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      console.log(`🗑️ Deleting: ${doc.data().title.substring(0, 50)}...`);
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`\n🎉 Successfully deleted ${snapshot.size} products!`);
    
  } catch (error) {
    console.error('❌ Error deleting products:', error);
  } finally {
    process.exit();
  }
}

// Run the script
deleteRecentProducts(50);
