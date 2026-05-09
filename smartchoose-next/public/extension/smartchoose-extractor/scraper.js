// SmartChoose Deep Scraper v4.0
// Chrome Extension content scripts have host_permissions => CORS is allowed!
// Full deep extraction: fetches each product page for 100% data fidelity.

(async function scrapePage() {
  const products = [];
  const isAmazon  = window.location.href.includes('amazon');
  const isFlipkart = window.location.href.includes('flipkart.com');
  const amazonTag  = window.SMARTCHOOSE_AMAZON_TAG  || '';
  const manualLink = window.SMARTCHOOSE_MANUAL_LINK || '';

  const delay = ms => new Promise(r => setTimeout(r, ms));

  // ── Image helpers ────────────────────────────────────────────────────────────
  function cleanAmazonImg(url) {
    if (!url || url.includes('base64') || url.includes('transparent')) return url;
    return url.replace(/\._[A-Z0-9,_]+_\./i, '._AC_SL1500_.');
  }
  function cleanFlipkartImg(url) {
    if (!url) return url;
    return url.replace(/\/image\/\d+\/\d+\//i, '/image/832/832/').replace(/\/image\/\d+\//i, '/image/832/');
  }

  function extractPrice(text) {
    if (!text) return '';
    const n = (text + '').replace(/[^\d]/g, '');
    return n ? `₹${parseInt(n).toLocaleString('en-IN')}` : '';
  }

  function makeAffLink(asin, href) {
    let base = asin ? `https://www.amazon.in/dp/${asin}` : (href || '').split('?')[0].split('/ref=')[0];
    if (!base) return '';
    if (amazonTag && base.includes('amazon.in')) base += (base.includes('?') ? '&' : '?') + `tag=${amazonTag}`;
    return base;
  }

  function guessCategory() {
    const s = (window.location.href + ' ' + document.title).toLowerCase();
    if (/mobile|smartphone/.test(s)) return 'Smartphones';
    if (/laptop|notebook/.test(s)) return 'Laptops';
    if (/earbuds|earphone|headphone|audio/.test(s)) return 'Audio';
    if (/watch|wearable/.test(s)) return 'Wearables';
    if (/tablet|ipad/.test(s)) return 'Tablets';
    if (/camera/.test(s)) return 'Cameras';
    if (/\btv\b|television|monitor/.test(s)) return 'TVs & Displays';
    if (/gaming/.test(s)) return 'Gaming & Accessories';
    if (/fashion|clothing|shirt|dress/.test(s)) return 'Fashion';
    if (/beauty|cosmetic|skincare/.test(s)) return 'Beauty';
    if (/kitchen|home appliance/.test(s)) return 'Home Appliances';
    return 'Electronics';
  }

  // ── Deep fetch an Amazon product page ────────────────────────────────────────
  async function deepFetchAmazon(p) {
    try {
      await delay(900);
      const res = await fetch(p.affiliateLink.split('?')[0], { credentials: 'omit' });
      if (!res.ok) { p.invalid = true; return; }
      const html = await res.text();

      // Title — use textContent-safe regex
      const titleMatch = html.match(/id="productTitle"[^>]*>\s*([\s\S]+?)\s*<\/span>/i);
      if (titleMatch && titleMatch[1].trim().length > 5) {
        p.fullTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        p.title = p.fullTitle;
      } else {
        p.invalid = true; // CAPTCHA / blocked
        return;
      }

      // Hi-res images from page JSON
      const hiResMatches = [...html.matchAll(/"hiRes"\s*:\s*"(https:[^"]+)"/g)];
      if (hiResMatches.length > 0) {
        p.images = hiResMatches.map(m => m[1]).filter(u => !u.includes('base64')).slice(0, 12);
        p.image  = p.images[0];
      } else {
        const largeMatches = [...html.matchAll(/"large"\s*:\s*"(https:[^"]+)"/g)];
        if (largeMatches.length > 0) {
          p.images = largeMatches.map(m => m[1]).filter(u => !u.includes('base64')).slice(0, 12);
          p.image  = p.images[0];
        }
      }

      // Bullet description — safe regex extraction
      const bulletsMatch = html.match(/id="feature-bullets"[\s\S]+?<ul[^>]*>([\s\S]+?)<\/ul>/i);
      if (bulletsMatch) {
        const liMatches = [...bulletsMatch[1].matchAll(/<li[^>]*>\s*<span[^>]*>([\s\S]+?)<\/span>/gi)];
        const blacklist = ['m.r.p', 'price:', 'you save', 'inclusive of', 'free delivery', 'sponsored'];
        const lines = liMatches
          .map(m => m[1].replace(/<[^>]+>/g, '').trim())
          .filter(t => t.length > 15 && !blacklist.some(b => t.toLowerCase().includes(b)));
        if (lines.length > 0) p.description = lines.slice(0, 10).join('\n\n');
      }

      // Brand
      const brandMatch = html.match(/id="bylineInfo"[^>]*>\s*(?:Visit the\s+)?<[^>]+>([^<]+)<\/a>/i);
      if (brandMatch) p.brand = brandMatch[1].trim();

      p.needsEnrichment = false;
    } catch (e) {
      console.warn('SmartChoose: deep fetch failed for', p.affiliateLink, e);
    }
  }

  // ── Deep fetch a Flipkart product page ───────────────────────────────────────
  async function deepFetchFlipkart(p) {
    try {
      const res = await fetch(p.affiliateLink.split('?')[0], { credentials: 'omit' });
      if (!res.ok) { p.invalid = true; return; }
      const html = await res.text();

      const ndMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]+?)<\/script>/i);
      if (!ndMatch) { p.invalid = true; return; }

      const nd = JSON.parse(ndMatch[1]);

      // Try multiple possible paths
      const pageData =
        nd?.props?.pageProps?.initialData?.data?.getProductDetails?.productDetails ||
        nd?.props?.pageProps?.initialData?.data?.productDetails ||
        nd?.props?.pageProps?.RESPONSE?.data?.productDetails ||
        nd?.props?.pageProps?.pageData ||
        nd?.props?.pageProps;

      if (!pageData) { p.invalid = true; return; }

      const fkTitle =
        pageData?.title ??
        pageData?.primaryInfo?.title ??
        pageData?.productName ??
        pageData?.name ??
        pageData?.productInfo?.value?.name;

      if (fkTitle && fkTitle.length > 5) {
        p.fullTitle = fkTitle;
        p.title = fkTitle;
      }

      // Images
      const imgs = pageData?.images ?? pageData?.media?.images ?? pageData?.imageUrls;
      if (imgs && (Array.isArray(imgs) || typeof imgs === 'string')) {
        const imgArr = Array.isArray(imgs) ? imgs : [imgs];
        const fetched = imgArr
          .map(i => cleanFlipkartImg(i?.url || i?.src || (typeof i === 'string' ? i : '')))
          .filter(u => u && !u.includes('base64'))
          .slice(0, 12);
        if (fetched.length > 0) { p.images = fetched; p.image = fetched[0]; }
      }

      // Description / highlights
      const hl = pageData?.highlights ?? pageData?.keyHighlights;
      if (Array.isArray(hl) && hl.length > 0) {
        p.description = hl.map(h => (typeof h === 'string' ? h : h?.text || h?.value || '')).filter(Boolean).join('\n\n');
      }

      p.needsEnrichment = false;
    } catch (e) {
      console.warn('SmartChoose: Flipkart deep fetch failed', e);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AMAZON
  // ════════════════════════════════════════════════════════════════════════════
  if (isAmazon) {
    const isSingle = !!document.querySelector('#productTitle');

    if (isSingle) {
      // ── Single Amazon product page ──────────────────────────────────────────
      try {
        const title = (document.querySelector('#productTitle')?.textContent || '').trim();
        if (!title) return products;

        const priceSelectors = [
          '.priceToPay .a-offscreen', '.priceToPay .a-price-whole',
          '#apex_desktop .a-price .a-offscreen',
          '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
          '.a-price[data-a-color="price"] .a-offscreen',
          '.a-price .a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice',
          '.a-price-whole'
        ];
        let price = '';
        for (const sel of priceSelectors) {
          const t = document.querySelector(sel)?.textContent;
          if (t) { price = extractPrice(t); if (price) break; }
        }

        const origEl = document.querySelector('.basisPrice .a-offscreen,.a-price.a-text-price .a-offscreen,#listPrice');
        const originalPrice = origEl ? extractPrice(origEl.textContent) : '';

        let asin = document.querySelector('#ASIN,input[name="ASIN"]')?.value || '';
        if (!asin) { const m = location.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i); if (m) asin = m[1]; }

        // Images from page script JSON (most reliable)
        let images = [];
        for (const sc of document.querySelectorAll('script:not([src])')) {
          const hits = [...(sc.textContent || '').matchAll(/"hiRes"\s*:\s*"(https:[^"]+)"/g)];
          if (hits.length > 0) { images = hits.map(m => m[1]).filter(u => !u.includes('base64')).slice(0, 12); break; }
        }
        if (!images.length) {
          document.querySelectorAll('#altImages li img,.imageThumbnail img').forEach(img => {
            const hi = cleanAmazonImg(img.src);
            if (hi && !hi.includes('base64') && !hi.includes('transparent') && !hi.includes('video')) images.push(hi);
          });
        }
        const mainImg = document.querySelector('#landingImage,#imgBlkFront');
        if (!images.length && mainImg) images = [cleanAmazonImg(mainImg.src)];

        // Bullets
        const blacklist = ['m.r.p', 'price:', 'you save', 'inclusive of', 'free delivery', 'sponsored', 'ships from', 'sold by'];
        let description = '';
        const bullets = Array.from(document.querySelectorAll('#feature-bullets .a-list-item,#featurebullets_feature_div .a-list-item'))
          .map(el => el.textContent.trim())
          .filter(t => t.length > 15 && !blacklist.some(b => t.toLowerCase().includes(b)));
        if (bullets.length) description = bullets.slice(0, 10).join('\n\n');
        if (!description) description = document.querySelector('#productDescription p')?.textContent.trim() || '';

        const brand = (document.querySelector('#bylineInfo')?.textContent || '').replace(/Visit the|Brand:/gi, '').trim() || 'Amazon';

        // Affiliate link — SiteStripe first
        let affiliateLink = location.href.split('?')[0].split('/ref=')[0];
        const ss = document.querySelector('#amzn-ss-text-shortlink-textarea,#amzn-ss-text-full-link-textarea');
        if (ss?.value?.includes('amzn')) affiliateLink = ss.value.trim();
        else affiliateLink = makeAffLink(asin, affiliateLink);

        products.push({
          title, fullTitle: title,
          url: affiliateLink, affiliateLink,
          image: images[0] || (asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg` : ''),
          images: images.length ? images : (asin ? [`https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg`] : []),
          price, originalPrice, description, brand,
          platform: 'Amazon', category: guessCategory(), needsEnrichment: false
        });
      } catch (e) { console.error('Amazon single page error', e); }

    } else {
      // ── Amazon search/listing page — bulk scrape + deep fetch ───────────────
      const cards = Array.from(document.querySelectorAll(
        '[data-component-type="s-search-result"][data-asin],' +
        '.s-result-item[data-asin]:not([data-asin=""])'
      )).filter(c => c.getAttribute('data-asin'));

      const category = guessCategory();

      for (const card of cards) {
        try {
          const titleEl = card.querySelector(
            '[data-cy="title-recipe"] h2 a span,h2.a-size-mini a span,' +
            'h2 a span.a-text-normal,.a-size-medium.a-color-base.a-text-normal,' +
            '.a-size-base-plus.a-color-base.a-text-normal,h2 a span'
          );
          const title = (titleEl?.textContent || '').trim();
          if (!title || title.length < 5) continue;

          const asin = card.getAttribute('data-asin') || '';
          const priceEl = card.querySelector('.a-price .a-offscreen,.a-price-whole,.p13n-sc-price');
          const price = priceEl ? extractPrice(priceEl.textContent) : '';
          const origEl = card.querySelector('.a-text-price .a-offscreen,.a-price.a-text-price .a-offscreen');
          const originalPrice = origEl ? extractPrice(origEl.textContent) : '';

          // Images
          const imgs = [];
          card.querySelectorAll('img').forEach(img => {
            const hi = cleanAmazonImg(img.src || img.getAttribute('data-src') || '');
            if (hi && hi.includes('amazon') && !hi.includes('base64') && !imgs.includes(hi)) imgs.push(hi);
          });
          let image = imgs[0] || (asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg` : '');
          const images = imgs.length ? imgs : (asin ? [image] : []);

          const linkEl = card.querySelector('a.a-link-normal[href*="/dp/"],a[href*="/dp/"],a[href*="/gp/product/"]');
          const affiliateLink = makeAffLink(asin, linkEl?.href || '');
          if (!affiliateLink) continue;

          const descEl = card.querySelector('.a-size-base.a-color-secondary,.a-row .a-size-base-plus.a-color-base');
          let description = (descEl?.textContent || '').trim();
          if (description.toLowerCase().includes('sponsored')) description = '';

          products.push({
            title, fullTitle: title,
            url: affiliateLink, affiliateLink,
            image, images, price, originalPrice,
            description: description || title,
            brand: 'Amazon', platform: 'Amazon', category,
            needsEnrichment: true
          });
        } catch (e) {}
      }

      // Deep fetch top 20 products for full data
      const toDeep = products.slice(0, 20);
      for (const p of toDeep) {
        await deepFetchAmazon(p);
      }
    }

  // ════════════════════════════════════════════════════════════════════════════
  // FLIPKART
  // ════════════════════════════════════════════════════════════════════════════
  } else if (isFlipkart) {
    const isSingle = !!(
      document.querySelector('[class*="B_NuCI"],[class*="yhB1nd"],[class*="G6XhRU"],[class*="VU-ZEz"]') &&
      document.querySelector('[class*="Nx9bqj"],[class*="_30jeq3"],[class*="CxhGGd"]')
    );

    if (isSingle) {
      // ── Single Flipkart product page ────────────────────────────────────────
      try {
        const titleEl = document.querySelector('[class*="B_NuCI"],[class*="yhB1nd"],[class*="G6XhRU"],[class*="VU-ZEz"]');
        const title = (titleEl?.textContent || '').trim();
        if (!title) return products;

        const priceEl = document.querySelector('[class*="Nx9bqj"],[class*="_30jeq3"],[class*="CxhGGd"]');
        const price = priceEl ? extractPrice(priceEl.textContent) : '';
        const origEl = document.querySelector('[class*="_3I9_wc"],[class*="yRaY8j"],[class*="27UcYP"]');
        const originalPrice = origEl ? extractPrice(origEl.textContent) : '';

        const images = [];
        document.querySelectorAll('[class*="_396cs4"] img,[class*="DByuf4"] img,[class*="qjESDB"] img,[class*="CZMQYi"] img').forEach(img => {
          const hi = cleanFlipkartImg(img.src || '');
          if (hi && !hi.includes('base64') && !images.includes(hi)) images.push(hi);
        });

        const hlEls = document.querySelectorAll('[class*="_1mXcCf"] li,[class*="X3BRps"] li,[class*="_2418kt"] li,[class*="Xc6yYM"] li');
        let description = Array.from(hlEls).map(el => el.textContent.trim()).filter(t => t.length > 5).join('\n\n');
        if (!description) {
          const descEl = document.querySelector('[class*="_1mXcCf"],[class*="X3BRps"]');
          description = (descEl?.textContent || '').trim();
        }

        const affiliateLink = location.href.split('?')[0];

        products.push({
          title, fullTitle: title,
          url: affiliateLink, affiliateLink,
          image: images[0] || '', images: images.slice(0, 12),
          price, originalPrice, description: description || title,
          brand: 'Flipkart', platform: 'Flipkart', category: guessCategory(),
          needsEnrichment: false
        });
      } catch (e) { console.error('Flipkart single page error', e); }

    } else {
      // ── Flipkart search/listing page — bulk scrape + deep fetch ────────────
      const category = guessCategory();

      const cards = Array.from(document.querySelectorAll(
        'div[class*="_1AtVbE"],div[class*="_4ddWXP"],div[class*="_2kHMtA"],div[class*="_1xFAF9"],div[class*="cPHDOP"]'
      ));

      for (const card of cards) {
        try {
          const titleEl = card.querySelector('[class*="IRpwTa"],[class*="s1Q9rs"],[class*="_4rR01T"],[class*="WKTcLC"],[class*="col-12-12"] a [class*="_4rR01T"]');
          let title = (titleEl?.textContent || '').trim();
          if (!title) {
            const anchor = card.querySelector('a[href*="/p/"]');
            title = (anchor?.textContent || '').trim().split('\n')[0];
          }
          if (!title || title.length < 5) continue;

          const priceEl = card.querySelector('[class*="_30jeq3"],[class*="Nx9bqj"],[class*="_1_WHN1"]');
          const price = priceEl ? extractPrice(priceEl.textContent) : '';
          const origEl = card.querySelector('[class*="_3I9_wc"],[class*="yRaY8j"]');
          const originalPrice = origEl ? extractPrice(origEl.textContent) : '';

          const images = [];
          card.querySelectorAll('img').forEach(img => {
            const hi = cleanFlipkartImg(img.src || '');
            if (hi && hi.includes('rukminim') && !hi.includes('base64') && !images.includes(hi)) images.push(hi);
          });

          const linkEl = card.querySelector('a[href*="/p/"]');
          if (!linkEl) continue;
          const raw = linkEl.getAttribute('href') || '';
          const affiliateLink = raw.startsWith('http') ? raw.split('?')[0] : `https://www.flipkart.com${raw.split('?')[0]}`;

          products.push({
            title, fullTitle: title,
            url: affiliateLink, affiliateLink,
            image: images[0] || '', images,
            price, originalPrice, description: title,
            brand: 'Flipkart', platform: 'Flipkart', category,
            needsEnrichment: true
          });
        } catch (e) {}
      }

      // Deep fetch top 20 products
      const toDeep = products.slice(0, 20);
      for (const p of toDeep) {
        await deepFetchFlipkart(p);
      }
    }
  }

  // ── Deduplicate ──────────────────────────────────────────────────────────────
  const seen = new Set();
  const uniqueProducts = [];
  for (const p of products) {
    if (p.invalid) continue;
    const key = (p.title || '').slice(0, 60).toLowerCase();
    if (!seen.has(key) && p.title) {
      seen.add(key);
      if (manualLink) { p.affiliateLink = manualLink; p.url = manualLink; }
      uniqueProducts.push(p);
    }
  }

  console.log(`✅ SmartChoose v4.0: ${uniqueProducts.length} products extracted.`);
  return uniqueProducts;
})();
