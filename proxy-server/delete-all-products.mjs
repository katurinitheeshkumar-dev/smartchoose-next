import 'dotenv/config';
import { db } from './api/_lib/firebase-admin.js';

async function deleteAllProducts() {
  try {
    console.log('Fetching products...');
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();
    
    if (snapshot.empty) {
      console.log('No products found.');
      return;
    }
    
    console.log(`Found ${snapshot.size} products. Deleting...`);
    
    // Firestore batch has a limit of 500 writes
    let count = 0;
    let batch = db.batch();
    
    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        
        if (count === 490) {
            await batch.commit();
            console.log('Committed 490 deletes...');
            batch = db.batch();
            count = 0;
        }
    }
    
    if (count > 0) {
        await batch.commit();
    }
    
    console.log(`Successfully deleted all ${snapshot.size} products!`);
    process.exit(0);
  } catch (error) {
    console.error('Error deleting products:', error);
    process.exit(1);
  }
}

deleteAllProducts();
