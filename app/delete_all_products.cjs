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

async function deleteAllProducts() {
  console.log('📡 Fetching ALL products for deletion...');
  
  try {
    const snapshot = await db.collection('products').get();

    if (snapshot.empty) {
      console.log('⚠️ No products found in the database.');
      return;
    }

    console.log(`✅ Found ${snapshot.size} products. Starting bulk deletion...`);

    // Delete in batches of 500
    const chunks = [];
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 500) {
      chunks.push(docs.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`🗑️ Deleted batch of ${chunk.length} items...`);
    }

    console.log(`\n🎉 SUCCESSFULLY DELETED ALL ${snapshot.size} PRODUCTS!`);
    console.log('The database is now 100% empty and ready for fresh imports.');
    
  } catch (error) {
    console.error('❌ Error deleting products:', error);
  } finally {
    process.exit();
  }
}

// Run the script
deleteAllProducts();
