/**
 * SmartChoose - Sitemap & Google Shopping Feed Generator
 * Run: node sitemap-generator.js (from the app/ folder)
 * Generates: public/sitemap.xml  +  public/shopping-feed.xml
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SITE_URL = 'https://smartchoose.in';
const FIREBASE_PROJECT_ID = 'smartchoose-official';
// ─────────────────────────────────────────────────────────────────────────────

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let app;
const serviceAccountPath = path.join(__dirname, 'service-account.json');

try {
  if (existsSync(serviceAccountPath)) {
    console.log('🔑 Using service-account.json for authentication...');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID
    });
  } else {
    console.log('☁️ No service-account.json found, trying default credentials...');
    app = initializeApp({ projectId: FIREBASE_PROJECT_ID });
  }
} catch (e) {
  app = initializeApp({ projectId: FIREBASE_PROJECT_ID }, 'sitemap-gen');
}

const db = getFirestore(app);

async function main() {
  console.log('📡 Fetching products from Firestore...');
  try {
    const snapshot = await db.collection('products')
      .where('published', '==', true)
      .get();

    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ Found ${products.length} published products`);

    console.log('📡 Fetching blog posts from Firestore...');
    const blogSnapshot = await db.collection('blogPosts')
      .where('status', '==', 'published')
      .get();

    const blogPosts = blogSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ Found ${blogPosts.length} published blog posts`);

    console.log('📡 Fetching jobs from Firestore...');
    const jobSnapshot = await db.collection('jobs')
      .where('status', '==', 'active')
      .get();
    
    const jobs = jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ Found ${jobs.length} active jobs`);

    // ── 1. Generate sitemap.xml ────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];

    const staticUrls = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/about`, priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE_URL}/blog`, priority: '0.9', changefreq: 'daily' },
      { loc: `${SITE_URL}/jobs`, priority: '0.8', changefreq: 'daily' },
      { loc: `${SITE_URL}/contact`, priority: '0.7', changefreq: 'monthly' },
      { loc: `${SITE_URL}/sitemap`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${SITE_URL}/privacy`, priority: '0.3', changefreq: 'yearly' },
      { loc: `${SITE_URL}/terms`, priority: '0.3', changefreq: 'yearly' },
      { loc: `${SITE_URL}/disclosure`, priority: '0.3', changefreq: 'yearly' },
      { loc: `${SITE_URL}/returns`, priority: '0.0', changefreq: 'yearly' },
    ];

    const productUrls = products.map(p => ({
      loc: `${SITE_URL}/product/${p.id}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : today,
    }));

    const blogUrls = blogPosts
      .filter(b => b.slug && b.slug !== 'undefined' && b.slug.trim().length > 3)
      .map(b => ({
        loc: `${SITE_URL}/${b.slug.trim()}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: b.updatedAt ? b.updatedAt.split('T')[0] : today,
      }));

    const jobUrls = jobs.map(j => ({
      loc: `${SITE_URL}/jobs/${j.id}`,
      priority: '0.7',
      changefreq: 'weekly',
      lastmod: j.postedAt ? j.postedAt.split('T')[0] : today,
    }));

    const allUrls = [...staticUrls, ...productUrls, ...blogUrls, ...jobUrls];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
    console.log(`✅ Sitemap written → ${sitemapPath} (${allUrls.length} URLs)`);

    // ── 2. Generate Google Shopping Feed (Merchant Center format) ──────────────
    const feedItems = products
      .filter(p => {
        // Skip products with zero or missing price
        const priceMatch = p.price ? String(p.price).match(/\d+/) : null;
        const priceValue = priceMatch ? parseInt(priceMatch[0]) : 0;
        return priceValue > 0;
      })
      .map(p => {
        const priceMatch = String(p.price).match(/\d+/);
        const price = priceMatch ? priceMatch[0] : '0';
        let image = (p.images && p.images[0]) ? p.images[0] : `${SITE_URL}/logo.png`;
      if (image.startsWith('//')) {
        image = 'https:' + image;
      } else if (!image.startsWith('http')) {
        // Fallback for data URIs, relative paths, etc. which Merchant Center rejects
        image = `${SITE_URL}/logo.png`;
      }
      const productUrl = escapeXml(`${SITE_URL}/product/${p.id}`);
      const title = escapeXml(p.title || '');
      const description = escapeXml(stripHtml(p.description || '').slice(0, 500));
      const category = escapeXml(p.category || 'General');
      const brand = escapeXml(p.brand || 'SmartChoose');

      // Map internal categories to Google Product Categories
      let googleCategory = 'Electronics'; // Default
      const catLower = category.toLowerCase();
      if (catLower.includes('earbud') || catLower.includes('headphone') || catLower.includes('bluetooth')) {
        googleCategory = 'Electronics &gt; Audio &gt; Audio Components &gt; Headphones &amp; Headsets';
      } else if (catLower.includes('watch') || catLower.includes('wearable')) {
        googleCategory = 'Electronics &gt; Communications &gt; Telephony &gt; Mobile Phone Accessories &gt; Smartwatches';
      } else if (catLower.includes('phone') || catLower.includes('mobile')) {
        googleCategory = 'Electronics &gt; Communications &gt; Telephony &gt; Mobile Phones';
      } else if (catLower.includes('gadget') || catLower.includes('electronic')) {
        googleCategory = 'Electronics';
      } else if (catLower.includes('accessories')) {
        googleCategory = 'Electronics &gt; Communications &gt; Telephony &gt; Mobile Phone Accessories';
      }

      return `  <item>
    <g:id>${escapeXml(p.id)}</g:id>
    <g:title>${title}</g:title>
    <g:description>${description}</g:description>
    <g:link>${productUrl}</g:link>
    <g:image_link>${escapeXml(image)}</g:image_link>
    <g:price>${escapeXml(price)} INR</g:price>
    <g:availability>in_stock</g:availability>
    <g:condition>new</g:condition>
    <g:brand>${brand}</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:product_type>${category}</g:product_type>
    <g:google_product_category>${googleCategory}</g:google_product_category>
    <g:shipping>
      <g:country>IN</g:country>
      <g:price>0 INR</g:price>
    </g:shipping>
  </item>`;
    });

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>SmartChoose - Product Feed</title>
    <link>${SITE_URL}</link>
    <description>SmartChoose affiliate product feed for Google Merchant Center</description>
${feedItems.join('\n')}
  </channel>
</rss>`;

    const feedPath = path.join(__dirname, 'public', 'shopping-feed.xml');
    fs.writeFileSync(feedPath, feed, 'utf-8');
    console.log(`✅ Shopping feed written → ${feedPath} (${products.length} products)`);

    console.log('\n🚀 Done! Next steps:');
    console.log('  1. Deploy to Firebase (run BuildAndDeploy.bat)');
    console.log(`  2. Submit sitemap to Google Search Console: ${SITE_URL}/sitemap.xml`);
    console.log(`  3. Submit shopping feed to Google Merchant Center: ${SITE_URL}/shopping-feed.xml`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing main:', err);
    process.exit(1);
  }
}

function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, ' ');
}

function escapeXml(str) {
  if (!str) return '';
  // Convert to string just in case
  const text = String(str);
  return text
    .replace(/[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm, '') // Remove invalid XML control characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

main().catch(err => {
  console.error('❌ Root Error:', err.message);
  process.exit(1);
});
