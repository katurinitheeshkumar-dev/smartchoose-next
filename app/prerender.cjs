/**
 * SmartChoose Pre-Renderer
 * Step 2 after `vite build`: generates static HTML copies for all key pages
 * so Google can index content WITHOUT JavaScript.
 *
 * Usage: node prerender.cjs  (from app/ folder)
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const DIST = path.join(__dirname, 'dist');
const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SITE_URL = 'https://smartchoose.in';
const FIREBASE_PROJECT_ID = 'smartchoose-official';
// ─────────────────────────────────────────────────────────────────────────────

// Initialize Firebase Admin
let app;
const serviceAccountPath = path.join(__dirname, 'service-account.json');

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID
    });
  } else {
    app = initializeApp({ projectId: FIREBASE_PROJECT_ID });
  }
} catch (e) {
  try {
    app = initializeApp({ projectId: FIREBASE_PROJECT_ID }, 'prerender-app');
  } catch (err) {
    // If it already exists, get the existing one
  }
}

const db = getFirestore(app);

// Data caches
const productsMap = new Map();
const blogsMap = new Map();
const jobsMap = new Map();

async function fetchData() {
  console.log('📡 Fetching data from Firestore for unique meta tags...');
  
  const productSnap = await db.collection('products').where('published', '==', true).get();
  productSnap.docs.forEach(doc => productsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  console.log(`  ✅ Cached ${productsMap.size} products`);

  const blogSnap = await db.collection('blogPosts').where('status', '==', 'published').get();
  blogSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.slug) blogsMap.set(data.slug.trim(), { id: doc.id, ...data });
  });
  console.log(`  ✅ Cached ${blogsMap.size} blog posts`);

  const jobSnap = await db.collection('jobs').where('status', '==', 'active').get();
  jobSnap.docs.forEach(doc => jobsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  console.log(`  ✅ Cached ${jobsMap.size} jobs`);
}

// ── Read sitemap.xml to get ALL routes ───────────────────────────────────────
let routes = ['/'];

function getRoutesFromSitemap() {
  try {
    const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    const matches = sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g);
    for (const m of matches) {
      const fullUrl = m[1].trim();
      if (fullUrl.startsWith(SITE_URL)) {
        const pathname = fullUrl.slice(SITE_URL.length) || '/';
        if (!routes.includes(pathname)) {
          routes.push(pathname);
        }
      }
    }
    console.log(`📋 Found ${routes.length} routes from sitemap.xml`);
  } catch (e) {
    console.warn('⚠️  Could not read sitemap.xml, using just /');
  }
}

// ── Mapping of routes → SEO metadata ─────────────────────────────────────────
function getMeta(route) {
  const base = {
    title: 'SmartChoose - Premium Products, Smart Choices',
    description: 'SmartChoose - Premium curated products with verified affiliate links. Compare prices across Amazon, Flipkart, Meesho & more.',
    canonical: `${SITE_URL}${route === '/' ? '/' : route}`,
    image: `${SITE_URL}/logo.png`,
    h1: 'SmartChoose - Premium Product Discovery'
  };

  if (route === '/') return base;

  if (route === '/about') return {
    ...base,
    title: 'About Us | SmartChoose - Premium Product Discovery',
    description: 'Learn more about SmartChoose, our mission to simplify product discovery, and how we help you make smart shopping choices.',
    h1: 'About SmartChoose'
  };

  if (route === '/blog') return {
    ...base,
    title: 'Blog | SmartChoose - Tech Reviews & Buying Guides',
    description: 'Read the latest product reviews, buying guides, and tech tips on the SmartChoose blog.',
    h1: 'SmartChoose Blog'
  };

  if (route === '/jobs') return {
    ...base,
    title: 'Jobs | SmartChoose Career Opportunities',
    description: 'Explore job opportunities and career listings on SmartChoose.',
    h1: 'Latest Job Openings'
  };

  // Product routes
  if (route.startsWith('/product/')) {
    const id = route.split('/').pop();
    const p = productsMap.get(id);
    if (p) {
      const price = p.price ? ` | ₹${p.price}` : '';
      return {
        title: `${p.title || 'Product'} Details${price} | SmartChoose`,
        description: `Buy ${p.fullTitle || p.title || 'this product'} on SmartChoose. ${stripHtml(p.description || '').slice(0, 160)}... Compare prices and get the best affiliate deals.`,
        canonical: `${SITE_URL}${route}`,
        image: (p.images && p.images[0]) ? p.images[0] : base.image,
        h1: p.fullTitle || p.title || 'Product Details'
      };
    }
  }

  // Job routes
  if (route.startsWith('/jobs/')) {
    const id = route.split('/').pop();
    const j = jobsMap.get(id);
    if (j) {
      return {
        title: `${j.title || 'Job Opening'} | SmartChoose Jobs`,
        description: `Apply for ${j.title} at ${j.company || 'SmartChoose'}. ${stripHtml(j.description || '').slice(0, 150)}... Find more career opportunities on SmartChoose.`,
        canonical: `${SITE_URL}${route}`,
        image: j.logo || `${SITE_URL}/jobs-og.png`,
        h1: j.title || 'Job Opportunity'
      };
    }
  }

  // Blog posts - lookup by slug
  const slug = route.startsWith('/') ? route.slice(1) : route;
  const b = blogsMap.get(slug);
  if (b) {
    return {
      title: `${b.title} | SmartChoose Blog`,
      description: b.excerpt || `${stripHtml(b.content || '').slice(0, 160)}...`,
      canonical: `${SITE_URL}${route}`,
      image: b.coverImage || base.image,
      h1: b.title
    };
  }

  // Fallback for static pages not explicitly handled
  const humanTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 60);
  return {
    ...base,
    title: `${humanTitle} | SmartChoose`,
    h1: humanTitle
  };
}

function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

// ── Inject meta into HTML ─────────────────────────────────────────────────────
function buildHtml(route, html) {
  const meta = getMeta(route);
  const { title, description, canonical, image, h1 } = meta;

  let out = html
    // Title
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    // Meta description
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${description.replace(/"/g, '&quot;')}" />`
    )
    // Canonical
    .replace(
      /<!-- Canonical Managed by App \(React Helmet\) -->/,
      `<link rel="canonical" href="${canonical}" />`
    )
    // OG: title
    .replace(
      /<meta property="og:title"[^>]*>/,
      `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`
    )
    // OG: description
    .replace(
      /<meta property="og:description"[^>]*>/,
      `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />`
    )
    // OG: url
    .replace(
      /<meta property="og:url"[^>]*>/,
      `<meta property="og:url" content="${canonical}" />`
    )
    // OG: image
    .replace(
      /<meta property="og:image"[^>]*>/,
      `<meta property="og:image" content="${image}" />`
    )
    // Twitter: title
    .replace(
      /<meta name="twitter:title"[^>]*>/,
      `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />`
    )
    // Twitter: description
    .replace(
      /<meta name="twitter:description"[^>]*>/,
      `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />`
    )
    // Twitter: image
    .replace(
      /<meta name="twitter:image"[^>]*>/,
      `<meta name="twitter:image" content="${image}" />`
    );

  // Inject a hidden H1 into the body for better indexing if it's not already there
  if (h1 && !out.includes(`<h1>${h1}</h1>`)) {
    out = out.replace('<body>', `<body>\n    <h1 style="display:none">${h1}</h1>`);
  }

  return out;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  getRoutesFromSitemap();
  await fetchData();

  console.log(`\n🚀 Generating static HTML for ${routes.length} pages...`);
  let count = 0;
  let skipped = 0;

  for (const route of routes) {
    try {
      const html = buildHtml(route, indexHtml);
      
      let filePath;
      if (route === '/') {
        filePath = path.join(DIST, 'index.html');
        fs.writeFileSync(filePath, html, 'utf-8');
      } else {
        const routeDir = path.join(DIST, route.startsWith('/') ? route.slice(1) : route);
        fs.mkdirSync(routeDir, { recursive: true });
        filePath = path.join(routeDir, 'index.html');
        fs.writeFileSync(filePath, html, 'utf-8');
      }
      count++;
      if (count % 20 === 0) console.log(`  ✅ Generated ${count}/${routes.length} pages...`);
    } catch (e) {
      console.warn(`  ⚠️  Skipped ${route}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Pre-rendering complete!`);
  console.log(`  📄 Generated: ${count} static HTML pages`);
  if (skipped > 0) console.log(`  ⚠️  Skipped: ${skipped} pages`);
  console.log(`\n🎯 Google will now see unique content on every page!`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

