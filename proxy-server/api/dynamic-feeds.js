import { db } from './_lib/firebase-admin.js';

const SITE_URL = 'https://smartchoose.in';

export default async function handler(req, res) {
  const { type } = req.query;

  try {
    if (type === 'shopping') {
      return await generateShoppingFeed(res);
    } else {
      return await generateSitemap(res);
    }
  } catch (err) {
    console.error('❌ Feed generation error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function generateShoppingFeed(res) {
    const snapshot = await db.collection('products')
      .where('published', '==', true)
      .get();

    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const feedItems = products
      .filter(p => {
        const priceMatch = p.price ? String(p.price).match(/\d+/) : null;
        const priceValue = priceMatch ? parseInt(priceMatch[0]) : 0;
        return priceValue > 0;
      })
      .map(p => {
        const priceMatch = String(p.price).match(/\d+/);
        const price = priceMatch ? priceMatch[0] : '0';
        let image = (p.images && p.images[0]) ? p.images[0] : `${SITE_URL}/logo.png`;
        if (image.startsWith('//')) image = 'https:' + image;
        else if (!image.startsWith('http')) image = `${SITE_URL}/logo.png`;
        
        const productUrl = escapeXml(`${SITE_URL}/product/${p.id}`);
        const title = escapeXml(p.title || '');
        const description = escapeXml(stripHtml(p.description || '').slice(0, 500));
        const category = escapeXml(p.category || 'General');
        const brand = escapeXml(p.brand || 'SmartChoose');

        let googleCategory = 'Electronics'; 
        const catLower = category.toLowerCase();
        if (catLower.includes('earbud') || catLower.includes('headphone')) googleCategory = 'Electronics &gt; Audio &gt; Audio Components &gt; Headphones &amp; Headsets';
        else if (catLower.includes('watch')) googleCategory = 'Electronics &gt; Communications &gt; Telephony &gt; Mobile Phone Accessories &gt; Smartwatches';

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
    <g:shipping><g:country>IN</g:country><g:price>0 INR</g:price></g:shipping>
  </item>`;
      });

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>SmartChoose - Dynamic Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Real-time SmartChoose affiliate product feed</description>
${feedItems.join('\n')}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(feed);
}

async function generateSitemap(res) {
    const [productsSnap, blogsSnap, jobsSnap] = await Promise.all([
      db.collection('products').where('published', '==', true).get(),
      db.collection('blogPosts').where('status', '==', 'published').get(),
      db.collection('jobs').where('status', '==', 'active').get()
    ]);

    const today = new Date().toISOString().split('T')[0];
    const staticUrls = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/blog`, priority: '0.9', changefreq: 'daily' },
      { loc: `${SITE_URL}/jobs`, priority: '0.8', changefreq: 'daily' },
    ];

    const productUrls = productsSnap.docs.map(doc => ({
      loc: `${SITE_URL}/product/${doc.id}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: doc.data().createdAt ? new Date(doc.data().createdAt).toISOString().split('T')[0] : today,
    }));

    const blogUrls = blogsSnap.docs
      .filter(doc => doc.data().slug && doc.data().slug.trim().length > 3)
      .map(doc => ({
        loc: `${SITE_URL}/${doc.data().slug.trim()}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: doc.data().updatedAt ? doc.data().updatedAt.split('T')[0] : today,
      }));

    const allUrls = [...staticUrls, ...productUrls, ...blogUrls];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(sitemap);
}

function stripHtml(str) { return str ? str.replace(/<[^>]*>?/gm, ' ') : ''; }
function escapeXml(str) {
  return String(str || '')
    .replace(/[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
