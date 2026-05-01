const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'smartchoose-official'
});

const db = getFirestore();

async function inspectProduct() {
  const productId = 'sc-1777275098823-qhlvixoxz';
  console.log(`📡 Fetching product: ${productId}...`);
  
  try {
    const doc = await db.collection('products').doc(productId).get();
    if (!doc.exists) {
      console.log('❌ Product not found.');
      return;
    }
    
    console.log(`✅ Product Found: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));

  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

inspectProduct();
