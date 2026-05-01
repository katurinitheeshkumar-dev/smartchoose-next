const admin = require('firebase-admin');
const { algoliasearch } = require('algoliasearch');

// Initialize Firebase Admin
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// Initialize Algolia
const client = algoliasearch('P0Z3D6UVHU', 'f296cf48c68b773f17fdae1ba9e2b4aa');

async function syncProducts() {
  console.log('Fetching products from Firestore...');
  try {
    const snapshot = await db.collection('products').get();
    const products = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Clean up Timestamps for Algolia (it can't serialize Firestore Timestamps)
      if (data.createdAt && data.createdAt.toDate) data.createdAt = data.createdAt.toDate().getTime();
      if (data.updatedAt && data.updatedAt.toDate) data.updatedAt = data.updatedAt.toDate().getTime();
      if (data.lastPriceSync && data.lastPriceSync.toDate) data.lastPriceSync = data.lastPriceSync.toDate().getTime();

      // Ensure a numeric price for sorting/filtering
      let numericPrice = 0;
      if (data.price) {
        const cleaned = String(data.price).replace(/[^\d.]/g, '');
        numericPrice = parseFloat(cleaned) || 0;
      }

      products.push({
        objectID: doc.id, // Important for Algolia to update instead of duplicate
        ...data,
        numericPrice
      });
    });

    console.log(`Found ${products.length} products. Uploading to Algolia...`);
    
    // Save objects to Algolia (v5 syntax)
    await client.saveObjects({ indexName: 'smartchoose_products', objects: products });
    console.log('✅ Successfully synced all products to Algolia!');
    
    // Configure Algolia Index Settings for optimal search (v5 syntax)
    await client.setSettings({
      indexName: 'smartchoose_products',
      indexSettings: {
        searchableAttributes: [
          'title',
          'fullTitle',
          'brand',
          'category',
          'features',
          'description'
        ],
        customRanking: [
          'desc(createdAt)'
        ],
        attributesForFaceting: [
          'category',
          'brand',
          'platform',
          'published'
        ]
      }
    });
    console.log('✅ Algolia settings configured successfully!');

  } catch (error) {
    console.error('Error syncing to Algolia:', error);
  }
}

syncProducts();
