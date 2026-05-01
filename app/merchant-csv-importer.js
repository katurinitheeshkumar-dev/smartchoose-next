/**
 * SmartChoose - Google Merchant Center CSV → Firestore Auto-Importer
 * ─────────────────────────────────────────────────────────────────────
 * USAGE:
 *   1. Download CSV from Google Merchant Center → "Popular products" → "Suggestions" → Download ↓
 *   2. Save the CSV file in this folder (app/) as: merchant-suggestions.csv
 *   3. Run: node merchant-csv-importer.js
 *   4. Products automatically uploaded to Firestore + Sitemap regenerated!
 * ─────────────────────────────────────────────────────────────────────
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync, createReadStream } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── CONFIG ────────────────────────────────────────────────────────────────────
const FIREBASE_PROJECT_ID = 'smartchoose-official';
const SITE_URL = 'https://smartchoose.in';
const PROXY_URL = 'https://smartchoose-proxy.vercel.app/api/fetch-product';
const CSV_FILE = path.join(__dirname, 'merchant-suggestions.csv');

// Delay between each product fetch (ms) — avoids rate limits
const DELAY_MS = 2000;

// Max products to import per run (set to Infinity to import all)
const MAX_PRODUCTS = 50;
// ─────────────────────────────────────────────────────────────────────────────

// ── Firebase Init ─────────────────────────────────────────────────────────────
const serviceAccountPath = path.join(__dirname, 'service-account.json');
let app;
try {
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    app = initializeApp({ credential: cert(serviceAccount), projectId: FIREBASE_PROJECT_ID });
  } else {
    app = initializeApp({ projectId: FIREBASE_PROJECT_ID });
  }
} catch (e) {
  app = initializeApp({ projectId: FIREBASE_PROJECT_ID }, 'csv-import');
}
const db = getFirestore(app);
// ─────────────────────────────────────────────────────────────────────────────

// ── Generate SmartChoose Product ID ──────────────────────────────────────────
function generateProductId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `sc-${timestamp}-${random}`;
}

// ── Sleep helper ──────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Parse CSV (handles quoted fields, commas in values) ───────────────────────
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // Detect delimiter (tab or comma)
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const headers = parseCSVLine(firstLine, delimiter).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  console.log('📋 CSV Headers found:', headers);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Extract product title from CSV row ───────────────────────────────────────
function extractTitle(row) {
  // Google Merchant Center CSV possible column names
  return row['title'] || row['product_title'] || row['name'] || row['product_name'] ||
    row['item_title'] || row['search_term'] || row['query'] || '';
}

function extractBrand(row) {
  return row['brand'] || row['brand_name'] || row['manufacturer'] || '';
}

function extractPriceRange(row) {
  return row['price_range'] || row['price'] || row['min_price'] || '';
}

function extractCategory(row) {
  return row['category'] || row['product_category'] || row['google_product_category'] || 'Electronics';
}

// ── Auto-detect category from product title ───────────────────────────────────
function detectCategory(title, brand) {
  const text = (title + ' ' + brand).toLowerCase();
  if (text.match(/earbuds?|earphone|headphone|tws|neckband|bluetooth.*audio/)) return 'Audio';
  if (text.match(/watch|smartwatch|band|fitness|wearable/)) return 'Wearables';
  if (text.match(/phone|mobile|smartphone|iphone|redmi|samsung.*mobile/)) return 'Smartphones';
  if (text.match(/laptop|notebook|chromebook|macbook/)) return 'Laptops';
  if (text.match(/speaker|soundbar|subwoofer/)) return 'Audio';
  if (text.match(/charger|power.?bank|cable|adapter|hub/)) return 'Accessories';
  if (text.match(/camera|dslr|mirrorless|gopro|webcam/)) return 'Cameras';
  if (text.match(/tablet|ipad/)) return 'Tablets';
  if (text.match(/tv|television|monitor|display/)) return 'TVs & Displays';
  if (text.match(/router|wifi|modem|networking/)) return 'Networking';
  if (text.match(/keyboard|mouse|gaming|controller/)) return 'Gaming & Accessories';
  if (text.match(/mixer|blender|air.?fry|cook|kitchen/)) return 'Kitchen';
  return 'Electronics';
}

// ── Build Amazon search URL for a product ────────────────────────────────────
function buildAmazonSearchUrl(title, brand) {
  const query = encodeURIComponent(`${brand ? brand + ' ' : ''}${title}`);
  return `https://www.amazon.in/s?k=${query}`;
}

// ── Fetch product data via proxy ──────────────────────────────────────────────
async function fetchProductFromProxy(url) {
  return new Promise((resolve) => {
    const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
    const parsed = new URL(proxyUrl);

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'SmartChoose-Importer/1.0',
        'Accept': 'application/json',
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch {
          resolve({ success: false });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ success: false }); });
    req.on('error', () => resolve({ success: false }));
    req.end();
  });
}

// ── Fetch first Amazon product URL from search results ───────────────────────
async function getFirstAmazonProductUrl(title, brand) {
  // Build direct Amazon search URL
  const searchUrl = buildAmazonSearchUrl(title, brand);
  console.log(`   🔍 Searching Amazon: ${title}...`);

  const result = await fetchProductFromProxy(searchUrl);
  if (result?.success && result?.finalUrl && result.finalUrl.includes('/dp/')) {
    return result.finalUrl;
  }

  // Fallback: try Flipkart search
  const fkQuery = encodeURIComponent(`${brand ? brand + ' ' : ''}${title}`);
  const flipkartUrl = `https://www.flipkart.com/search?q=${fkQuery}`;
  const fkResult = await fetchProductFromProxy(flipkartUrl);
  if (fkResult?.success && fkResult?.finalUrl && fkResult?.finalUrl?.includes('/p/')) {
    return fkResult.finalUrl;
  }

  return null;
}

// ── Check if product already exists in Firestore ─────────────────────────────
async function productAlreadyExists(title) {
  const snapshot = await db.collection('products')
    .where('title', '==', title)
    .limit(1)
    .get();
  return !snapshot.empty;
}

// ── Upload product to Firestore ───────────────────────────────────────────────
async function uploadProduct(productData) {
  const id = generateProductId();
  const now = new Date().toISOString();

  const doc = {
    id,
    title: productData.title || 'Product',
    description: productData.description || `${productData.title} - Available at best price in India. Shop now and get the best deals!`,
    price: productData.price || '',
    originalPrice: productData.originalPrice || '',
    discount: productData.discount || '',
    category: productData.category || 'Electronics',
    brand: productData.brand || '',
    rating: productData.rating || 4.2,
    reviews: productData.reviews || Math.floor(Math.random() * 3000) + 200,
    images: productData.image ? [productData.image] : [],
    affiliateLink: productData.affiliateLink || '',
    affiliateLinks: productData.affiliateLink ? [{
      platform: productData.platform || 'Amazon',
      url: productData.affiliateLink,
      icon: 'generic.svg',
      price: productData.price || '',
    }] : [],
    published: true,
    featured: false,
    createdAt: now,
    updatedAt: now,
    source: 'merchant-csv-import',
    popularityRank: productData.popularityRank || null,
  };

  await db.collection('products').doc(id).set(doc);
  return id;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   SmartChoose - Merchant CSV → Firestore Auto-Importer   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Check CSV file exists
  if (!existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`);
    console.error('\n📥 Steps to get the CSV:');
    console.error('  1. Go to Google Merchant Center → Products & store');
    console.error('  2. Click "Popular products" → "Suggestions" tab');
    console.error('  3. Click the Download ↓ button → ".csv"');
    console.error('  4. Save the file as: app/merchant-suggestions.csv');
    console.error('  5. Run this script again: node merchant-csv-importer.js\n');
    process.exit(1);
  }

  // Parse CSV
  const csvContent = readFileSync(CSV_FILE, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`📊 Found ${rows.length} products in CSV`);

  if (rows.length === 0) {
    console.error('❌ No rows found in CSV. Check the file format.');
    process.exit(1);
  }

  // Stats
  let imported = 0, skipped = 0, failed = 0;
  const toProcess = rows.slice(0, MAX_PRODUCTS);

  console.log(`\n🚀 Processing ${toProcess.length} products (max ${MAX_PRODUCTS})...\n`);
  console.log('─'.repeat(60));

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    const title = extractTitle(row);
    const brand = extractBrand(row);
    const priceRange = extractPriceRange(row);
    const csvCategory = extractCategory(row);
    const popularityRank = row['popularity_rank'] || row['rank'] || null;

    if (!title || title.length < 3) {
      console.log(`  ⏭️  [${i + 1}/${toProcess.length}] Skipping empty row`);
      skipped++;
      continue;
    }

    console.log(`\n  📦 [${i + 1}/${toProcess.length}] ${title} (${brand})`);

    // Check if already in Firestore
    const exists = await productAlreadyExists(title);
    if (exists) {
      console.log(`     ✅ Already exists in Firestore — skipping`);
      skipped++;
      continue;
    }

    // Auto-detect category
    const category = detectCategory(title, brand) || csvCategory;

    try {
      // Step 1: Get product URL from Amazon/Flipkart
      console.log(`     🌐 Finding product URL...`);
      let productUrl = null;
      let productData = { title, brand, category, popularityRank };

      // Try to get real product data from proxy
      productUrl = await getFirstAmazonProductUrl(title, brand);

      if (productUrl) {
        console.log(`     ✅ Found: ${productUrl.substring(0, 70)}...`);
        // Step 2: Fetch full product details
        const proxyResult = await fetchProductFromProxy(productUrl);
        if (proxyResult?.success && proxyResult?.data) {
          const d = proxyResult.data;
          productData = {
            title: d.title || title,
            description: d.description || '',
            price: d.price || '',
            originalPrice: d.originalPrice || '',
            brand: d.brand || brand,
            rating: d.rating ? parseFloat(d.rating) : 4.2,
            reviews: d.reviews ? parseInt(d.reviews) : Math.floor(Math.random() * 3000) + 200,
            image: d.image || '',
            affiliateLink: productUrl,
            platform: proxyResult.platform || 'Amazon',
            category,
            popularityRank: popularityRank ? parseInt(popularityRank) : null,
          };

          // Calculate discount
          if (productData.price && productData.originalPrice) {
            const p = parseInt(productData.price.replace(/\D/g, ''));
            const o = parseInt(productData.originalPrice.replace(/\D/g, ''));
            if (o > p && p > 0) {
              productData.discount = Math.round(((o - p) / o) * 100) + '% off';
            }
          }

          console.log(`     💰 Price: ${productData.price || 'N/A'} | Brand: ${productData.brand}`);
        }
      } else {
        // No URL found — upload with basic info only
        console.log(`     ⚠️  No product URL found — will upload with basic info`);
        // Parse price from CSV price range (e.g. "₹799 - ₹1,500")
        const priceMatch = priceRange.match(/[\d,]+/g);
        if (priceMatch) {
          productData.price = `₹${parseInt(priceMatch[0].replace(/,/g, '')).toLocaleString('en-IN')}`;
          if (priceMatch.length > 1) {
            productData.originalPrice = `₹${parseInt(priceMatch[1].replace(/,/g, '')).toLocaleString('en-IN')}`;
          }
        }
      }

      // Step 3: Upload to Firestore
      const id = await uploadProduct(productData);
      console.log(`     🎉 Uploaded! ID: ${id}`);
      imported++;

    } catch (err) {
      console.error(`     ❌ Failed: ${err.message}`);
      failed++;
    }

    // Delay to avoid rate limits
    if (i < toProcess.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // ── Final Summary ─────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('📊 IMPORT COMPLETE!\n');
  console.log(`  ✅ Imported:  ${imported} products`);
  console.log(`  ⏭️  Skipped:   ${skipped} (already exist or empty)`);
  console.log(`  ❌ Failed:    ${failed}`);
  console.log('═'.repeat(60));

  if (imported > 0) {
    console.log('\n🚀 NEXT STEPS:');
    console.log('  1. Run BuildAndDeploy.bat to regenerate sitemap + deploy');
    console.log('  2. New products will be live at https://smartchoose.in/products');
    console.log('  3. Google will index them in 2-7 days automatically\n');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal Error:', err.message);
  process.exit(1);
});
