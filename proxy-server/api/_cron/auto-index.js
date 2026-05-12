/**
 * SmartChoose - Auto Indexing Cron Job
 * =======================================
 * Schedule: Daily at 8:30 PM UTC (2:00 AM IST)
 * 
 * Does:
 * 1. Reads all published product/job URLs from Firestore
 * 2. Submits them to IndexNow API (Bing/Yandex - instant indexing)
 * 3. Submits them to Google Indexing API via service account
 * 4. Pings Google + Bing sitemap
 * 5. Logs result to Firestore for Admin Panel display
 */

import { db } from '../_lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

const SITE_URL = 'https://smartchoose.in';
const INDEXNOW_KEY = 'dd5c73365f1c0bd0015bb64f56861a45';

// Google Indexing API via service account in env
async function getGoogleAuthClient() {
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });
    return await auth.getClient();
  } catch (e) {
    console.warn('⚠️ Google auth failed:', e.message);
    return null;
  }
}

async function pingSitemaps() {
  const sitemapUrl = encodeURIComponent(`${SITE_URL}/sitemap.xml`);
  const results = {};
  for (const [name, url] of [['google', `https://www.google.com/ping?sitemap=${sitemapUrl}`], ['bing', `https://www.bing.com/ping?sitemap=${sitemapUrl}`]]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      results[name] = res.status;
    } catch (e) {
      results[name] = 'error';
    }
  }
  return results;
}

async function submitIndexNow(urls) {
  const BATCH_SIZE = 100;
  let submitted = 0;
  
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch('https://www.bing.com/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: 'smartchoose.in',
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: batch
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (res.status === 200 || res.status === 202) submitted += batch.length;
    } catch (e) {
      console.warn('IndexNow batch error:', e.message);
    }
    if (i + BATCH_SIZE < urls.length) await new Promise(r => setTimeout(r, 300));
  }
  return submitted;
}

async function submitToGoogleIndexing(urls, client) {
  if (!client) return { success: 0, fail: urls.length };
  let success = 0, fail = 0;
  
  for (const url of urls) {
    try {
      const res = await client.request({
        url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
        method: 'POST',
        data: { url, type: 'URL_UPDATED' }
      });
      if (res.status === 200) success++;
      else fail++;
    } catch (e) {
      fail++;
      if (e.message?.includes('Quota exceeded')) {
        console.log('Google Indexing API daily quota reached. Will resume tomorrow.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 120)); // Stay within 200/day quota
  }
  return { success, fail };
}

export default async function handler(req, res) {
  // Allow both cron calls and manual calls from Admin Panel
  const isCron = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;
  const isAdmin = req.headers['x-admin-trigger'] === 'true';
  
  if (!isCron && !isAdmin && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  console.log('🚀 Auto-Indexing started...');

  try {
    // 1. Get all published product URLs from Firestore
    const productsSnap = await db.collection('products')
      .where('published', '==', true)
      .select('id')
      .get();
    
    const productUrls = productsSnap.docs.map(d => `${SITE_URL}/product/${d.id}`);

    // 2. Get all published job URLs from Firestore
    const jobsSnap = await db.collection('jobs')
      .where('status', '==', 'active')
      .select('id')
      .get();
    
    const jobUrls = jobsSnap.docs.map(d => `${SITE_URL}/jobs/${d.id}`);

    // 2b. Get all published blog URLs from Firestore
    const blogsSnap = await db.collection('blogPosts')
      .where('status', '==', 'published')
      .select('slug')
      .get();
    
    const blogUrls = blogsSnap.docs.map(d => `${SITE_URL}/blog/${d.data().slug}`);

    // 3. Static URLs
    const staticUrls = [
      `${SITE_URL}/`,
      `${SITE_URL}/blog`,
      `${SITE_URL}/products`,
      `${SITE_URL}/jobs`,
      `${SITE_URL}/about`,
      `${SITE_URL}/contact`,
    ];

    // --- HANDLE SINGLE URL INDEXING (INSTANT MODE) ---
    const targetUrl = req.body?.url;
    if (targetUrl) {
      console.log(`⚡ Instant indexing requested for: ${targetUrl}`);
      const [indexNowRes, googleClient] = await Promise.all([
        submitIndexNow([targetUrl]),
        getGoogleAuthClient()
      ]);
      const googleRes = await submitToGoogleIndexing([targetUrl], googleClient);
      
      return res.status(200).json({ 
        success: true, 
        mode: 'instant',
        url: targetUrl,
        indexNow: indexNowRes > 0,
        google: googleRes.success > 0
      });
    }

    const allUrls = [...staticUrls, ...productUrls, ...jobUrls, ...blogUrls];
    const priorityUrls = [...productUrls, ...jobUrls, ...blogUrls]; // Google Indexing API for these

    console.log(`📋 URLs: ${productUrls.length} products, ${jobUrls.length} jobs, ${blogUrls.length} blogs, ${staticUrls.length} static`);

    // 4. Run indexing in parallel
    const [sitemapPings, indexNowCount, googleClient] = await Promise.all([
      pingSitemaps(),
      submitIndexNow(allUrls),
      getGoogleAuthClient()
    ]);

    // 5. Google Indexing API (rate-limited)
    // We take the latest 200 URLs to stay within quota
    const googleResult = await submitToGoogleIndexing(priorityUrls.slice(0, 200), googleClient);

    const duration = Math.round((Date.now() - startTime) / 1000);
    const result = {
      timestamp: new Date().toISOString(),
      totalUrls: allUrls.length,
      indexNowSubmitted: indexNowCount,
      googleIndexing: googleResult,
      sitemapPing: sitemapPings,
      duration: `${duration}s`,
      triggeredBy: isAdmin ? 'admin_manual' : 'cron_daily'
    };

    // 6. Save result to Firestore for Admin Panel display
    await db.collection('settings').doc('lastIndexingRun').set({
      ...result,
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log('✅ Auto-indexing complete:', result);
    return res.status(200).json({ success: true, ...result });

  } catch (error) {
    console.error('❌ Auto-indexing error:', error);
    
    // Save error to Firestore too
    await db.collection('settings').doc('lastIndexingRun').set({
      timestamp: new Date().toISOString(),
      error: error.message,
      updatedAt: FieldValue.serverTimestamp()
    }).catch(() => {});

    return res.status(500).json({ error: error.message });
  }
}
