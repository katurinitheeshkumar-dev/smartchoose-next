// SmartChoose - Algolia Full Sync Script
// Run: node sync-algolia.js
// Fetches ALL products from Firebase and pushes to Algolia

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { algoliasearch } = require('algoliasearch');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, 'smartchoose-next', '.env.local');
const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
const env = {};
for (const line of envLines) {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
}

const ALGOLIA_APP_ID  = env['NEXT_PUBLIC_ALGOLIA_APP_ID'];
const ALGOLIA_WRITE   = env['ALGOLIA_WRITE_KEY'];
const FIREBASE_SA     = path.join(__dirname, 'firebase-service-account.json');

async function main() {
  // ── Algolia client ──────────────────────────────
  const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE);

  // ── Firebase Admin ──────────────────────────────
  let db;
  if (fs.existsSync(FIREBASE_SA)) {
    const serviceAccount = require(FIREBASE_SA);
    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
  } else {
    console.log('[SKIP] firebase-service-account.json not found - skipping Algolia sync');
    console.log('       To enable: download from Firebase Console → Project Settings → Service Accounts');
    process.exit(0);
  }

  // ── Fetch all products from Firestore ───────────
  console.log('[SYNC] Fetching products from Firebase...');
  const snap = await db.collection('products').where('published', '==', true).get();
  const products = snap.docs.map(d => ({ ...d.data(), id: d.id, objectID: d.id }));
  console.log(`[SYNC] Found ${products.length} published products`);

  if (products.length === 0) {
    console.log('[SYNC] No products to sync.');
    process.exit(0);
  }

  // ── Push to Algolia in batches ──────────────────
  const BATCH = 500;
  let synced = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    await algolia.saveObjects({ indexName: 'products', objects: batch });
    synced += batch.length;
    console.log(`[SYNC] Pushed ${synced}/${products.length} products to Algolia`);
  }

  console.log(`[SYNC] Done! ${synced} products synced to Algolia.`);
}

main().catch(e => {
  console.error('[SYNC ERROR]', e.message);
  process.exit(1);
});
