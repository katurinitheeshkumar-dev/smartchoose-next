/**
 * SmartChoose - Auto Indexing Script
 * ====================================
 * Automatically notifies search engines about new/updated pages.
 *
 * How it works:
 * 1. Reads sitemap.xml to get all URLs
 * 2. Pings Google & Bing via sitemap ping
 * 3. Submits all URLs to IndexNow API (Bing/Yandex instant indexing)
 * 4. Submits product/job pages to Google Indexing API
 *
 * Run: node auto-index.js  (from app/ folder)
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://smartchoose.in';
const INDEXNOW_KEY = 'dd5c73365f1c0bd0015bb64f56861a45'; // 32-char hex key required by IndexNow spec

// ── Step 1: Read all URLs from sitemap.xml ──────────────────────────────────
function getAllUrls() {
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  if (!existsSync(sitemapPath)) {
    console.warn('⚠️  sitemap.xml not found. Run sitemap-generator.js first!');
    return [];
  }
  const content = readFileSync(sitemapPath, 'utf-8');
  const matches = [...content.matchAll(/<loc>(.*?)<\/loc>/g)];
  return matches.map(m => m[1].trim());
}

// ── Step 2: Ensure IndexNow key file exists in /dist and /public ─────────────
function ensureIndexNowKeyFile() {
  // Write to both dist/ (live Firebase) and public/ (so it persists after builds)
  const distKeyPath = path.join(__dirname, 'dist', `${INDEXNOW_KEY}.txt`);
  const publicKeyPath = path.join(__dirname, 'public', `${INDEXNOW_KEY}.txt`);
  writeFileSync(distKeyPath, INDEXNOW_KEY, 'utf-8');
  writeFileSync(publicKeyPath, INDEXNOW_KEY, 'utf-8');
  console.log(`✅ IndexNow key file ready: ${INDEXNOW_KEY}.txt`);
}

// ── Step 3: Ping Google & Bing sitemap ───────────────────────────────────────
async function pingSitemaps() {
  const sitemapUrl = encodeURIComponent(`${SITE_URL}/sitemap.xml`);
  const pingUrls = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
  ];

  console.log('\n📡 Pinging sitemap to search engines...');
  for (const url of pingUrls) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow' });
      const engine = url.includes('google') ? 'Google' : 'Bing';
      const ok = res.status >= 200 && res.status < 400;
      console.log(`  ${ok ? '✅' : '⚠️ '} ${engine} ping: HTTP ${res.status}`);
    } catch (e) {
      console.warn(`  ⚠️  Sitemap ping failed: ${e.message}`);
    }
  }
}

// ── Step 4: Submit to IndexNow (Instant Bing/Yandex indexing) ────────────────
async function submitToIndexNow(urls) {
  if (urls.length === 0) return;

  console.log(`\n⚡ Submitting ${urls.length} URLs to IndexNow...`);
  const BATCH_SIZE = 100;
  let totalSubmitted = 0;

  const endpoints = [
    'https://www.bing.com/indexnow',
    'https://api.indexnow.org/indexnow',
  ];

  for (const endpoint of endpoints) {
    let endpointSuccess = 0;

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            host: 'smartchoose.in',
            key: INDEXNOW_KEY,
            keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
            urlList: batch
          })
        });

        if (res.status === 200 || res.status === 202) {
          endpointSuccess += batch.length;
        } else if (res.status === 403) {
          console.warn(`  ⚠️  ${endpoint}: 403 (key not yet verified online - deploy first)`);
          break;
        } else {
          const text = await res.text().catch(() => '');
          console.warn(`  ⚠️  ${endpoint}: HTTP ${res.status}`);
          break;
        }
      } catch (e) {
        console.warn(`  ⚠️  ${endpoint} error: ${e.message}`);
        break;
      }
      if (i + BATCH_SIZE < urls.length) await new Promise(r => setTimeout(r, 300));
    }

    if (endpointSuccess > 0) {
      totalSubmitted += endpointSuccess;
      console.log(`  ✅ ${endpoint.split('/')[2]}: ${endpointSuccess} URLs submitted!`);
      break;
    }
  }

  if (totalSubmitted > 0) {
    console.log(`  🎉 IndexNow complete: ${totalSubmitted} URLs → Bing/Yandex will index within hours!`);
  } else {
    console.log(`  ℹ️  IndexNow skipped (key not yet verified). Sitemap ping sent instead.`);
  }
}

// ── Step 5: Google Indexing API (for Job Posting pages) ──────────────────────
async function submitToGoogleIndexingApi(urls) {
  // IMPORTANT: Google Indexing API is strictly for JobPosting or BroadcastEvent schema.
  // Using it for general products might be ignored or seen as spam.
  const targetUrls = urls.filter(u => u.includes('/jobs/')); 

  if (targetUrls.length === 0) {
    console.log('\n  ℹ️  No job URLs for Google Indexing API. (Products use Sitemap/IndexNow)');
    return;
  }

  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  if (!existsSync(serviceAccountPath)) {
    console.warn('\n  ⚠️  service-account.json not found. Skipping Google Indexing API.');
    return;
  }

  console.log(`\n🔍 Submitting ${targetUrls.length} URLs to Google Indexing API...`);

  let GoogleAuth;
  try {
    const module = await import('google-auth-library');
    GoogleAuth = module.GoogleAuth;
  } catch (e) {
    console.warn('  ⚠️  google-auth-library not installed. Run: npm install google-auth-library');
    return;
  }

  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });
    const client = await auth.getClient();

    let success = 0;
    let fail = 0;

    for (const url of targetUrls) {
      try {
        const response = await client.request({
          url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
          method: 'POST',
          data: { url, type: 'URL_UPDATED' }
        });
        if (response.status === 200) success++;
        else { fail++; }
        await new Promise(r => setTimeout(r, 100)); // Rate limit: 200/day
      } catch (e) {
        fail++;
        // Only show first few errors to avoid spam
        if (fail <= 3) console.warn(`  ⚠️  ${url.split('/').pop()}: ${e.message?.slice(0, 80)}`);
      }
    }
    console.log(`  ✅ Google Indexing API: ${success} success, ${fail} failed`);
    if (success > 0) console.log(`  🎉 Google will crawl and index these pages within hours!`);
  } catch (e) {
    console.warn(`  ⚠️  Google Indexing API error: ${e.message?.slice(0, 100)}`);
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   SmartChoose Auto-Indexing Script         ║');
  console.log('╚════════════════════════════════════════════╝');

  ensureIndexNowKeyFile();

  const urls = getAllUrls();
  console.log(`\n📋 Found ${urls.length} URLs in sitemap.xml`);

  if (urls.length === 0) {
    console.error('❌ No URLs found. Make sure sitemap.xml exists in public/');
    process.exit(1);
  }

  await pingSitemaps();
  await submitToIndexNow(urls);
  await submitToGoogleIndexingApi(urls);

  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log(`║  ✅ Auto-indexing complete!                ║`);
  console.log(`║  📄 ${String(urls.length).padEnd(4)} URLs submitted to search engines ║`);
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log('  What happens next:');
  console.log('  • Bing/Yandex: URLs indexed within hours (IndexNow)');
  console.log('  • Google products: Indexed via Google Indexing API');
  console.log('  • All other pages: Re-crawl queued via sitemap ping');
  console.log('');
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
