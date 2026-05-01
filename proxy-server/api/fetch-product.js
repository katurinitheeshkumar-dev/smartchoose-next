// SmartChoose Product Fetch Proxy v3
// Strategy: For affiliate links (EarnKaro, Wishlink, etc.):
//   1. Scan affiliate page HTML for embedded product URLs
//   2. Follow any found product URL to real store page
//   3. Extract product data from real store page

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Browser-like headers
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'identity',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
};

// Known affiliate redirect domains
const AFFILIATE_DOMAINS = [
    'wishlink.com', 'earnkaro.com', 'ekaro.in', 'extrape.com', 'extrapay.com',
    'linksynergy.com', 'bit.ly', 'tinyurl.com', 'amzn.to', 'amzn.in',
    'fkrt.it', 'fkrt.cc', 'dl.flipkart.com', 'clnk.in', 'shrinkme.io',
    'cutt.ly', 'myurl.in', 'go.flipkart.com', 'aff.tatacliq.com',
    'tracking.myntra.com', 'cashkaro.com', 'cheque.in', 'desidime.com',
    // Meesho short links
    'ltl.sh', 'm.ltl.sh', 'meesho-dl.com', 'msho.co',
];

// Known e-commerce domains and their product URL patterns
const STORE_PATTERNS = [
    { domain: 'flipkart.com', pattern: /https?:\/\/(?:www\.)?flipkart\.com\/[^"'\s<>]{10,}/gi, name: 'Flipkart' },
    { domain: 'amazon.in', pattern: /https?:\/\/(?:www\.)?amazon\.in\/[^"'\s<>]{10,}/gi, name: 'Amazon' },
    { domain: 'amazon.com', pattern: /https?:\/\/(?:www\.)?amazon\.com\/[^"'\s<>]{10,}/gi, name: 'Amazon' },
    { domain: 'myntra.com', pattern: /https?:\/\/(?:www\.)?myntra\.com\/[^"'\s<>]{10,}/gi, name: 'Myntra' },
    { domain: 'meesho.com', pattern: /https?:\/\/(?:www\.)?meesho\.com\/[^"'\s<>]{10,}/gi, name: 'Meesho' },
    { domain: 'ajio.com', pattern: /https?:\/\/(?:www\.)?ajio\.com\/[^"'\s<>]{10,}/gi, name: 'Ajio' },
    { domain: 'nykaa.com', pattern: /https?:\/\/(?:www\.)?nykaa\.com\/[^"'\s<>]{10,}/gi, name: 'Nykaa' },
    { domain: 'snapdeal.com', pattern: /https?:\/\/(?:www\.)?snapdeal\.com\/[^"'\s<>]{10,}/gi, name: 'Snapdeal' },
    { domain: 'tatacliq.com', pattern: /https?:\/\/(?:www\.)?tatacliq\.com\/[^"'\s<>]{10,}/gi, name: 'Tata Cliq' },
    { domain: 'croma.com', pattern: /https?:\/\/(?:www\.)?croma\.com\/[^"'\s<>]{10,}/gi, name: 'Croma' },
    { domain: 'jiomart.com', pattern: /https?:\/\/(?:www\.)?jiomart\.com\/[^"'\s<>]{10,}/gi, name: 'JioMart' },
];

// Detect platform name from URL
function detectPlatform(url) {
    const u = url.toLowerCase();
    for (const s of STORE_PATTERNS) {
        if (u.includes(s.domain)) return s.name;
    }
    if (u.includes('amzn.')) return 'Amazon';
    if (u.includes('fkrt.')) return 'Flipkart';
    // Meesho short/affiliate links
    if (u.includes('ltl.sh') || u.includes('msho.co') || u.includes('meesho-dl')) return 'Meesho';
    return 'Store';
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDQAy3eooUcA77VGOvioIt3aKDrLhzn1Zs';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt) {
    try {
        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
            })
        });
        const data = await res.json();
        if (!res.ok) {
            console.error('[callGemini] API Error:', JSON.stringify(data));
            return null;
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            console.error('[callGemini] No candidates found:', JSON.stringify(data));
            return null;
        }
        return text.trim();
    } catch (e) {
        console.error('[callGemini] Request Exception:', e.message);
        return null;
    }
}

// Platforms that REQUIRE JavaScript rendering - direct HTTP always fails
const JS_HEAVY_PLATFORMS = ['Meesho', 'Myntra', 'Flipkart'];

// Known app-logo image URLs to reject (not product images)
const APP_LOGO_PATTERNS = [
    'meesho.com/images/meesho_logo',
    'meesho.com/favicon',
    'lf16-co-id',  // Meesho app icon CDN
    'play-lh.googleusercontent.com',  // Play Store icons
    'is1-ssl.mzstatic.com',  // App Store icons
    '_next/static',
];

function isAppLogo(imgUrl) {
    if (!imgUrl) return true;
    const u = imgUrl.toLowerCase();
    return APP_LOGO_PATTERNS.some(p => u.includes(p));
}

// ── ScrapingBee: renders full JS, uses residential proxies → bypasses site blocks
// FREE: 1000 credits/month at scrapingbee.com — plenty for 15-20 products/month
const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY || '';

async function fetchWithScrapingBee(productUrl) {
    if (!SCRAPINGBEE_KEY) return null;
    try {
        const params = new URLSearchParams({
            api_key: SCRAPINGBEE_KEY,
            url: productUrl,
            render_js: 'true',
            wait: '3000',
            block_ads: 'true',
            premium_proxy: 'false',
        });
        const result = await fetchPage(`https://app.scrapingbee.com/api/v1/?${params}`, { timeout: 30000 });
        if (!result.html || result.html.length < 500) return null;
        return result.html; // Fully rendered HTML
    } catch (e) {
        console.warn('[ScrapingBee] Error:', e.message);
        return null;
    }
}

// Try Jina.ai reader — renders JavaScript, works for SPAs like Meesho, Myntra
async function tryJinaAi(productUrl) {
    try {
        const jinaRes = await fetchPage(`https://r.jina.ai/${productUrl}`, {
            headers: {
                'Accept': 'application/json',
                'X-Return-Format': 'json',
                'X-Timeout': '10',
            },
            timeout: 12000,
        });
        const json = JSON.parse(jinaRes.html);
        if (!json?.data) return null;
        const d = json.data;

        // Extract price from markdown content (₹ patterns)
        const content = d.content || d.text || '';
        const prices = [...content.matchAll(/₹\s*([0-9,]+)/g)]
            .map(m => parseInt(m[1].replace(/,/g, '')))
            .filter(n => n > 0 && n < 10000000)
            .sort((a, b) => a - b);

        // Validate image — reject app logos
        let image = '';
        const imgs = d.images || [];
        for (const img of (Array.isArray(imgs) ? imgs : [imgs])) {
            const src = typeof img === 'string' ? img : img?.url || img?.src || '';
            if (src && !isAppLogo(src) && src.startsWith('http')) { image = src; break; }
        }
        if (!image && d.screenshot) image = d.screenshot;

        const title = (d.title || '').replace(/[-|].*?(Amazon|Flipkart|Meesho|Myntra|Buy Online).*/i, '').trim();

        return {
            title,
            fullTitle: d.title || title,
            description: d.description || d.content || '',
            image,
            price: prices[0] ? `₹${prices[0].toLocaleString('en-IN')}` : '',
            originalPrice: prices.length >= 2 ? `₹${prices[prices.length - 1].toLocaleString('en-IN')}` : '',
            brand: '',
            rating: '',
            reviews: '',
        };
    } catch (_) { return null; }
}

// Is this URL an affiliate/redirect domain?
function isAffiliateDomain(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return AFFILIATE_DOMAINS.some(d => hostname.includes(d));
    } catch { return false; }
}

// Is this URL a known shopping product URL?
function isProductUrl(url) {
    try {
        const u = url.toLowerCase();
        // Must be on a known store domain
        if (!STORE_PATTERNS.some(s => u.includes(s.domain))) return false;
        // Must have enough path depth (not just homepage)
        const path = new URL(url).pathname;
        if (path.length < 5) return false;
        // Flipkart product pages have /p/ in path
        if (u.includes('flipkart.com') && !u.includes('/p/') && !u.includes('/itm/')) return false;
        // Amazon product pages have /dp/ in path
        if ((u.includes('amazon.in') || u.includes('amazon.com')) && !u.includes('/dp/') && !u.includes('/gp/')) return false;
        return true;
    } catch { return false; }
}

// Scan HTML for embedded product URLs from known stores
function extractProductUrlFromHtml(html) {
    // First: try JSON data (most reliable)
    const jsonPatterns = [
        /"deeplink"\s*:\s*"([^"]+)"/i,
        /"productUrl"\s*:\s*"([^"]+)"/i,
        /"destination_url"\s*:\s*"([^"]+)"/i,
        /"redirectUrl"\s*:\s*"([^"]+)"/i,
        /"targetUrl"\s*:\s*"([^"]+)"/i,
        /"finalUrl"\s*:\s*"([^"]+)"/i,
        /redirectTo\s*=\s*["']([^"']+)["']/i,
        /data-redirect-url=["']([^"']+)["']/i,
    ];
    for (const pat of jsonPatterns) {
        const match = html.match(pat)?.[1];
        if (match && isProductUrl(decodeURIComponent(match))) {
            return decodeURIComponent(match);
        }
    }

    // Second: find ALL URLs in HTML and filter for product URLs
    const urlMatches = html.match(/https?:\/\/[^\s"'<>\\]{15,}/gi) || [];
    for (const u of urlMatches) {
        const clean = u.replace(/[\\]+$/, '').replace(/["'>)]+$/, '');
        if (isProductUrl(clean)) return clean;
    }

    // Third: URL-encoded product URLs (common in affiliate pages)
    const encodedMatches = html.match(/https?%3A%2F%2F[^\s"'<>&]{15,}/gi) || [];
    for (const u of encodedMatches) {
        const decoded = decodeURIComponent(u).replace(/["'>)]+$/, '');
        if (isProductUrl(decoded)) return decoded;
    }

    return null;
}

// Simple fetch with redirect following (HTTP only)
function fetchPage(url, options = {}) {
    return new Promise((resolve, reject) => {
        let redirectCount = 0;
        const maxRedirects = options.maxRedirects || 8;

        function doRequest(currentUrl) {
            let parsed;
            try { parsed = new URL(currentUrl); } catch (e) { return reject(e); }

            const lib = parsed.protocol === 'https:' ? https : http;
            const reqOptions = {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: options.method || 'GET',
                headers: {
                    ...BROWSER_HEADERS,
                    'Host': parsed.hostname,
                    'Referer': `https://${parsed.hostname}/`,
                    ...(options.headers || {}),
                },
                timeout: options.timeout || 13000,
            };

            const req = lib.request(reqOptions, (res) => {
                const { statusCode } = res;
                const location = res.headers['location'];

                if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
                    if (redirectCount >= maxRedirects) return reject(new Error('Too many redirects'));
                    redirectCount++;
                    const next = location.startsWith('http') ? location : `${parsed.protocol}//${parsed.hostname}${location}`;
                    res.resume();
                    return doRequest(next);
                }

                let body = '';
                res.setEncoding('utf8');
                res.on('data', chunk => {
                    body += chunk;
                    if (body.length > 600000) res.destroy();
                });
                res.on('end', () => resolve({
                    url: currentUrl,
                    html: body,
                    statusCode,
                    headers: res.headers,
                }));
            });
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.on('error', reject);
            req.end();
        }
        doRequest(url);
    });
}

// Follow meta refresh and simple JS redirects from HTML
function extractHtmlRedirect(html, baseHost) {
    // meta refresh redirect
    const metaMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'\s>]+)/i)?.[1]
        || html.match(/content=["'][^"']*url=([^"'\s>]+)[^>]*http-equiv=["']refresh["']/i)?.[1];
    if (metaMatch) {
        const u = decodeURIComponent(metaMatch.replace(/['"]/g, '').trim());
        if (u.startsWith('http')) return u;
        return `https://${baseHost}${u.startsWith('/') ? '' : '/'}${u}`;
    }

    // JS window.location redirects
    const jsPatterns = [
        /window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
        /location\.replace\s*\(\s*["']([^"']+)["']\s*\)/i,
        /location\.assign\s*\(\s*["']([^"']+)["']\s*\)/i,
    ];
    for (const pat of jsPatterns) {
        const m = html.match(pat)?.[1];
        if (m && m.startsWith('http')) return m;
    }
    return null;
}

// Extract product data from final product page HTML
function extractProductData(html, url) {
    const data = {
        title: '', fullTitle: '', description: '', image: '', price: '',
        originalPrice: '', brand: '', rating: '', reviews: '', platform: '',
        features: [], specifications: {}
    };

    // --- JSON-LD structured data (most reliable) ---
    const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of jsonLdBlocks) {
        try {
            const text = block.replace(/<\/?script[^>]*>/gi, '');
            const json = JSON.parse(text);
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
                const p = item['@type'] === 'Product' ? item
                    : (item['@graph']?.find(i => i['@type'] === 'Product'));
                if (p) {
                    if (!data.fullTitle && p.name) data.fullTitle = p.name;
                    if (!data.title && p.name) {
                        // Create a neat short title for Admin/Tab
                        data.title = String(p.name).split(/[-|]/)[0].trim().substring(0, 60);
                    }
                    if (!data.description && p.description) data.description = String(p.description).replace(/<[^>]+>/g, '').substring(0, 5000);
                    if (!data.brand && p.brand?.name) data.brand = p.brand.name;
                    if (!data.image && p.image) data.image = Array.isArray(p.image) ? p.image[0] : p.image;
                    if (!data.rating && p.aggregateRating?.ratingValue) data.rating = String(p.aggregateRating.ratingValue);
                    if (!data.reviews && p.aggregateRating?.reviewCount) data.reviews = String(p.aggregateRating.reviewCount);
                    const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
                    if (offer?.price && !data.price) data.price = `₹${parseFloat(offer.price).toLocaleString('en-IN')}`;
                    break;
                }
            }
        } catch (_) { }
    }

    // --- OG tags ---
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1];
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i)?.[1];
    const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

    if (!data.fullTitle && ogTitle) data.fullTitle = decodeHtml(ogTitle);
    if (!data.fullTitle && titleTag) data.fullTitle = decodeHtml(titleTag);
    if (!data.title) data.title = data.fullTitle ? data.fullTitle.split(/[-|]/)[0].trim().substring(0, 60) : '';
    
    if (!data.description && ogDesc) data.description = decodeHtml(ogDesc);
    if (!data.image && ogImg) data.image = ogImg;

    const u = url.toLowerCase();

    // --- AMAZON specific ---
    // --- AMAZON specific ---
    if (u.includes('amazon.')) {
        data.platform = 'Amazon';
        // Explicit Amazon Title
        const amzTitle = html.match(/id="productTitle"[^>]*>([^<]+)</i)?.[1]?.trim();
        if (amzTitle) {
            data.fullTitle = decodeHtml(amzTitle);
            if (!data.title) data.title = data.fullTitle.split(/[-|]/)[0].trim().substring(0, 60);
        }

        // Explicit Amazon Description (Bullet points)
        if (!data.description || data.description.toLowerCase().includes('sponsored')) {
            const bulletMatches = html.matchAll(/<li[^>]*><span class="a-list-item">([\s\S]+?)<\/span>/gi);
            const bullets = [];
            for (const match of bulletMatches) {
                const text = match[1].replace(/<[^>]+>/g, '').trim();
                if (text.length > 15 && !text.toLowerCase().includes('click here') && !text.toLowerCase().includes('sponsored')) {
                    bullets.push(decodeHtml(text));
                }
            }
            if (bullets.length > 0) data.description = bullets.slice(0, 10).join('\n');
        }

        const priceWhole = html.match(/class="a-price-whole">([^<]+)</i)?.[1]?.replace(/[^\d]/g, '');
        if (priceWhole && !data.price) data.price = `₹${parseInt(priceWhole).toLocaleString('en-IN')}`;
        const strike = html.match(/class="a-text-price"[^>]*><span[^>]*>([^<]+)</i)?.[1]
            || html.match(/class="a-text-strike">([^<]+)</i)?.[1];
        if (strike && !data.originalPrice) data.originalPrice = strike.replace(/\s+/g, '').trim();
        const rating = html.match(/([0-9.]+) out of 5 stars/i)?.[1];
        if (rating && !data.rating) data.rating = rating;
        const asin = url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
        if (asin && !data.image) {
            data.image = `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg`;
        }
        if (!data.brand) data.brand = 'Amazon';

        // Extract technical specifications table
        const specMatches = html.matchAll(/<tr>\s*<th[^>]*>([\s\S]+?)<\/th>\s*<td[^>]*>([\s\S]+?)<\/td>\s*<\/tr>/gi);
        for (const match of specMatches) {
            const key = match[1].replace(/<[^>]+>/g, '').trim();
            const val = match[2].replace(/<[^>]+>/g, '').trim();
            if (key && val && key.length < 50 && val.length < 500 && !key.toLowerCase().includes('customer reviews')) {
                data.specifications[decodeHtml(key)] = decodeHtml(val);
            }
        }
        
        // Also try the specific product info table
        const prodInfoMatches = html.matchAll(/<th[^>]*class="a-color-secondary[^>]*>([\s\S]+?)<\/th>\s*<td[^>]*class="a-size-base[^>]*>([\s\S]+?)<\/td>/gi);
        for (const match of prodInfoMatches) {
            const key = match[1].replace(/<[^>]+>/g, '').trim();
            const val = match[2].replace(/<[^>]+>/g, '').trim();
            if (key && val && key.length < 50) {
                data.specifications[decodeHtml(key)] = decodeHtml(val);
            }
        }

        // Features (Bullet points)
        const bulletMatches = html.matchAll(/<li[^>]*><span class="a-list-item">([\s\S]+?)<\/span>/gi);
        const bullets = [];
        for (const match of bulletMatches) {
            const text = match[1].replace(/<[^>]+>/g, '').trim();
            if (text.length > 15 && !text.toLowerCase().includes('click here') && !text.toLowerCase().includes('sponsored')) {
                bullets.push(decodeHtml(text));
            }
        }
        if (bullets.length > 0) {
            data.features = bullets.slice(0, 10);
            if (!data.description) data.description = bullets.join('\n');
        }
    }

    // --- FLIPKART specific ---
    else if (u.includes('flipkart.')) {
        data.platform = 'Flipkart';

        // === Try __NEXT_DATA__ (Flipkart uses Next.js SSR — real product data is here) ===
        const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]+?)<\/script>/i)
            || html.match(/<script[^>]*>\s*window\.__NEXT_DATA__\s*=\s*([\s\S]+?);?\s*<\/script>/i);
        if (nextDataMatch?.[1]) {
            try {
                const nd = JSON.parse(nextDataMatch[1]);
                // Navigate Next.js page props
                const props = nd?.props?.pageProps;
                // Try multiple paths Flipkart uses
                const pdp = props?.initialData?.data?.getProductDetails?.productDetails
                    ?? props?.RESPONSE?.data?.productDetails
                    ?? props?.pageData?.productListing
                    ?? props;

                // Title
                const fkTitle = pdp?.title ?? pdp?.primaryInfo?.title ?? pdp?.productName ?? pdp?.name;
                if (fkTitle) {
                    data.fullTitle = String(fkTitle);
                    if (!data.title) data.title = data.fullTitle.split(/[-|]/)[0].trim().substring(0, 60);
                }

                // Price
                const pricing = pdp?.pricing ?? pdp?.priceInfo ?? pdp?.sellingPriceInfo;
                const fkPrice = pricing?.finalPrice?.value ?? pricing?.sellingPrice?.value
                    ?? pdp?.mrpPrice ?? pdp?.finalPrice;
                if (fkPrice && !data.price) data.price = `₹${parseInt(fkPrice).toLocaleString('en-IN')}`;

                const fkMrp = pricing?.mrpPrice?.value ?? pdp?.mrp;
                if (fkMrp && !data.originalPrice) data.originalPrice = `₹${parseInt(fkMrp).toLocaleString('en-IN')}`;

                // Images
                const imgs = pdp?.images ?? pdp?.media?.images ?? pdp?.imageUrls;
                if (imgs && !data.image) {
                    data.image = Array.isArray(imgs) ? imgs[0]?.url ?? imgs[0] : imgs;
                }

                // Brand
                const fkBrand = pdp?.brand?.name ?? pdp?.brandInfo?.name ?? pdp?.seller?.sellerName;
                if (fkBrand && !data.brand) data.brand = String(fkBrand);

                // Rating
                const fkRating = pdp?.rating?.average ?? pdp?.overallRating;
                if (fkRating && !data.rating) data.rating = String(fkRating);

                const fkReviews = pdp?.rating?.count ?? pdp?.reviewInfo?.reviewCount;
                if (fkReviews && !data.reviews) data.reviews = String(fkReviews);
            } catch (_) { }
        }

        // Fallback: regex price extraction from HTML text
        if (!data.price) {
            const fkPrice = html.match(/class="Nx9bqj[^"]*">₹?([0-9,]+)/i)?.[1]
                || html.match(/"finalPrice":\s*\{[^}]*"value":\s*(\d+)/i)?.[1]
                || html.match(/"price":\s*"([0-9,]+)"/i)?.[1];
            if (fkPrice) data.price = `₹${parseInt(fkPrice.replace(/,/g, '')).toLocaleString('en-IN')}`;
        }
        if (!data.originalPrice) {
            const fkOrig = html.match(/class="yRaY8j[^"]*">₹?([0-9,]+)/i)?.[1]
                || html.match(/"mrpPrice":\s*\{[^}]*"value":\s*(\d+)/i)?.[1]
                || html.match(/"mrp":\s*"([0-9,]+)"/i)?.[1];
            if (fkOrig) data.originalPrice = `₹${parseInt(fkOrig.replace(/,/g, '')).toLocaleString('en-IN')}`;
        }
        if (!data.brand) data.brand = 'Flipkart';

        // Extract specifications from __NEXT_DATA__
        const nextDataMatchForSpecs = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]+?)<\/script>/i);
        if (nextDataMatchForSpecs?.[1]) {
            try {
                const nd = JSON.parse(nextDataMatchForSpecs[1]);
                const specs = nd?.props?.pageProps?.initialData?.data?.getProductDetails?.productDetails?.specifications;
                if (Array.isArray(specs)) {
                    specs.forEach(group => {
                        if (Array.isArray(group.values)) {
                            group.values.forEach(v => {
                                if (v.name && v.value) data.specifications[v.name] = v.value;
                            });
                        }
                    });
                }
                
                // Highlights/Features
                const highlights = nd?.props?.pageProps?.initialData?.data?.getProductDetails?.productDetails?.highlights;
                if (Array.isArray(highlights)) {
                    data.features = highlights.map(h => h.text).filter(Boolean);
                }
            } catch (_) { }
        }
    }

    // --- MYNTRA specific ---
    else if (u.includes('myntra.')) {
        data.platform = 'Myntra';
        const mnPrice = html.match(/"discountedPrice"\s*:\s*([0-9.]+)/)?.[1];
        const mnMrp = html.match(/"mrp"\s*:\s*([0-9.]+)/)?.[1];
        if (mnPrice && !data.price) data.price = `₹${parseFloat(mnPrice).toLocaleString('en-IN')}`;
        if (mnMrp && !data.originalPrice) data.originalPrice = `₹${parseFloat(mnMrp).toLocaleString('en-IN')}`;
        const mnBrand = html.match(/"brand"\s*:\s*"([^"]+)"/)?.[1];
        if (mnBrand && !data.brand) data.brand = mnBrand;
    }

    // --- MEESHO specific ---
    else if (u.includes('meesho.')) {
        data.platform = 'Meesho';
        const msPrice = html.match(/"finalPrice"\s*:\s*([0-9.]+)/)?.[1]
            || html.match(/"price"\s*:\s*([0-9.]+)/)?.[1];
        if (msPrice && !data.price) data.price = `₹${parseFloat(msPrice).toLocaleString('en-IN')}`;
    }

    return data;
}

function decodeHtml(str) {
    return String(str)
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .trim();
}

function isBlockedPage(html, statusCode) {
    if (statusCode >= 400) return true;
    const signals = ['Robot Check', 'CAPTCHA', 'Enter the characters', 'Request blocked', 'Access Denied', '503 Service'];
    return signals.some(s => html.includes(s));
}

function isGenericHomepage(html, url) {
    try {
        const path = new URL(url).pathname;
        if (path.length > 5) return false; // has a path, probably a product
    } catch { }
    // Check title — generic homepage titles
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    const genericTitles = ['online shopping', 'shop online', 'flipkart.com', 'amazon.in', 'myntra.com'];
    return genericTitles.some(t => title.toLowerCase().includes(t)) && title.toLowerCase().includes('india');
}


// ==== MAIN HANDLER ====
module.exports = async function handler(req, res) {
    // Support both GET (?url=...) and POST ({ url: '...' })
    const url = req.query.url || (req.body && req.body.url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!url && req.method !== 'POST') return res.status(400).json({ error: 'Missing url parameter' });

    const action = req.query.action || (req.body && req.body.action);

    // AI Enrichment Action
    if (action === 'enrich') {
        const product = req.body.product;
        if (!product) return res.status(400).json({ error: 'Missing product data' });

        const prompt = `Act as an expert Amazon Product Copywriter. 
        Enrich this product data to make it look premium and professional.
        
        PRODUCT DATA:
        - Current Title: ${product.title}
        - Full Title: ${product.fullTitle || ''}
        - Brand: ${product.brand || ''}
        - Category: ${product.category || ''}
        - Description: ${product.description || ''}
        
        RETURN ONLY A RAW JSON OBJECT with these fields:
        {
          "fullTitle": "Professional, SEO-friendly title with brand and key specs (60-150 chars)",
          "title": "Neat, short title for mobile tabs (20-40 chars)",
          "description": "Engaging 2-3 paragraph product description highlighting value",
          "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
          "specifications": { "Key": "Value", ... },
          "pros": ["Pro 1", "Pro 2", "Pro 3"]
        }
        
        Rules:
        - Use professional English.
        - Ensure specifications include relevant tech specs (e.g. Battery, Material, Size).
        - If the brand is missing, suggest a likely one based on the title.
        - Start immediately with { and end with }. Do not use markdown blocks.`;

        const enrichedText = await callGemini(prompt);
        if (enrichedText) {
            try {
                // Remove potential markdown blocks
                const cleanJson = enrichedText.replace(/```json/g, '').replace(/```/g, '').trim();
                const enrichedData = JSON.parse(cleanJson);
                return res.status(200).json({ success: true, data: enrichedData });
            } catch (e) {
                console.error('Gemini JSON Parse Error:', e.message, enrichedText);
                return res.status(500).json({ success: false, error: 'AI returned malformed data' });
            }
        }
        return res.status(500).json({ success: false, error: 'AI failed to enrich product' });
    }

    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    try {
        const originalUrl = decodeURIComponent(url);
        new URL(originalUrl); // validate

        let productUrl = null;
        let affiliatePage = null;

        // ===== STAGE 1: Fetch the initial URL (affiliate or direct) =====
        const firstFetch = await fetchPage(originalUrl);
        const firstHtml = firstFetch.html;
        const firstFinalUrl = firstFetch.url;

        // Check if we're already on a product page
        if (isProductUrl(firstFinalUrl)) {
            productUrl = firstFinalUrl;
        } else {
            affiliatePage = { html: firstHtml, url: firstFinalUrl };

            // ===== STAGE 2: Scan affiliate page HTML for embedded product URLs =====
            productUrl = extractProductUrlFromHtml(firstHtml);

            // ===== STAGE 3: Try JS redirect from affiliate page =====
            if (!productUrl) {
                try {
                    const jsRedirectUrl = extractHtmlRedirect(firstHtml, new URL(firstFinalUrl).hostname);
                    if (jsRedirectUrl && jsRedirectUrl !== firstFinalUrl) {
                        const secondFetch = await fetchPage(jsRedirectUrl);
                        const secondUrl = secondFetch.url;
                        if (isProductUrl(secondUrl)) {
                            productUrl = secondUrl;
                        } else {
                            // Scan this page too
                            productUrl = extractProductUrlFromHtml(secondFetch.html);
                        }
                    }
                } catch (_) { }
            }
        }

        // ===== STAGE 4: Fetch the actual product page =====
        if (productUrl) {
            let productHtml = '';
            let finalProductUrl = productUrl;
            let productStatusCode = 200;
            try {
                const productFetch = await fetchPage(productUrl);
                productHtml = productFetch.html;
                finalProductUrl = productFetch.url;
                productStatusCode = productFetch.statusCode || 200;
            } catch (_) { }

            const platform = detectPlatform(finalProductUrl) !== 'Store'
                ? detectPlatform(finalProductUrl)
                : detectPlatform(originalUrl);
            const asin = finalProductUrl.match(/\/dp\/([A-Z0-9]{10})/i)?.[1]
                || originalUrl.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];

            // ===== STAGE 4a: JS-heavy platforms — ScrapingBee (residential IP) → Jina.ai fallback =====
            if (JS_HEAVY_PLATFORMS.includes(platform)) {
                // Try ScrapingBee first (residential IP = not blocked by sites)
                const sbHtml = await fetchWithScrapingBee(finalProductUrl);
                if (sbHtml && sbHtml.length > 1000) {
                    const data = extractProductData(sbHtml, finalProductUrl);
                    data.platform = platform;
                    if (data.title && data.title.length > 5) {
                        return res.status(200).json({
                            success: true, finalUrl: finalProductUrl, originalUrl, platform,
                            blocked: false, resolvedFromAffiliate: !!affiliatePage, scrapingBeeFallback: true, data,
                        });
                    }
                }
                // Fallback to Jina.ai if ScrapingBee not configured or failed
                const jinaData = await tryJinaAi(finalProductUrl);
                if (jinaData && jinaData.title && jinaData.title.length > 5) {
                    jinaData.platform = platform;
                    if (asin && !jinaData.image) jinaData.image = `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg`;
                    return res.status(200).json({
                        success: true, finalUrl: finalProductUrl, originalUrl, platform,
                        blocked: false, resolvedFromAffiliate: !!affiliatePage, jinaFallback: true, data: jinaData,
                    });
                }
            }


            const blocked = isBlockedPage(productHtml, productStatusCode);
            const homepage = isGenericHomepage(productHtml, finalProductUrl);

            if (!blocked && !homepage) {
                const data = extractProductData(productHtml, finalProductUrl);
                if (!data.platform) data.platform = platform;
                if (asin && !data.image) data.image = `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg`;
                // Reject app logos
                if (isAppLogo(data.image)) data.image = asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg` : '';

                const titleEmpty = !data.title || data.title.length < 5;
                return res.status(200).json({
                    success: true, finalUrl: finalProductUrl, originalUrl, platform,
                    blocked: titleEmpty, resolvedFromAffiliate: !!affiliatePage, data,
                });

            } else {
                // ===== Try Jina.ai when direct fetch is blocked =====
                if (platform === 'Flipkart' || platform === 'Myntra' || platform === 'Amazon') {
                    try {
                        const jinaRes = await fetchPage(`https://r.jina.ai/${finalProductUrl}`, {
                            headers: { 'Accept': 'application/json', 'X-Return-Format': 'json' },
                            timeout: 10000,
                        });
                        const jinaJson = JSON.parse(jinaRes.html);
                        const d = jinaJson?.data;
                        if (d?.title && d.title.length > 5) {
                            const jinaData = {
                                title: d.title || '',
                                description: d.description || '',
                                image: (d.images && d.images[0]) || (asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg` : ''),
                                price: '',
                                originalPrice: '',
                                brand: platform,
                                rating: '',
                                reviews: '',
                                platform,
                                fullTitle: d.title || '',
                            };
                            const content = d.content || '';
                            const prices = [...content.matchAll(/₹\s*([0-9,]+)/g)].map(m => parseInt(m[1].replace(/,/g, '')));
                            if (prices.length >= 1) jinaData.price = `₹${prices[0].toLocaleString('en-IN')}`;
                            if (prices.length >= 2 && prices[1] > prices[0]) jinaData.originalPrice = `₹${prices[1].toLocaleString('en-IN')}`;
                            return res.status(200).json({
                                success: true, finalUrl: finalProductUrl, originalUrl, platform,
                                blocked: false, resolvedFromAffiliate: true, jinaFallback: true, data: jinaData,
                            });
                        }
                    } catch (_) { }
                }
                // Still blocked — ASIN image at minimum
                return res.status(200).json({
                    success: true, finalUrl: finalProductUrl, originalUrl, platform, blocked: true,
                    data: {
                        title: '', description: '', brand: platform,
                        image: asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg` : '',
                        price: '', originalPrice: '', rating: '', reviews: '', platform
                    },
                });
            }
        }

        // ===== STAGE 5: Could not resolve to a product — return empty =====
        const platform = detectPlatform(firstFinalUrl) !== 'Store' ? detectPlatform(firstFinalUrl) : detectPlatform(originalUrl);
        return res.status(200).json({
            success: true,
            finalUrl: firstFinalUrl,
            originalUrl,
            platform,
            blocked: true,
            data: {
                title: '', description: '', brand: platform,
                image: '', price: '', originalPrice: '', rating: '', reviews: '', platform,
            }
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
