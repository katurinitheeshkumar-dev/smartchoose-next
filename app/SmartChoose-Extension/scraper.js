// Amazon & Flipkart DOM Scraper with High-Res Image Support & Deep Extraction
(async function scrapePage() {
  const products = [];
  const isAmazon = window.location.href.includes("amazon");
  const amazonTag = window.SMARTCHOOSE_AMAZON_TAG || '';
  const manualLink = window.SMARTCHOOSE_MANUAL_LINK || '';

  function getHighResImage(url, platform) {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('transparent') || url.includes('base64')) return url;
    try {
      if (platform === 'Amazon') {
        return url.replace(/\._[A-Z0-9,_]+_\./i, '.');
      } 
      if (platform === 'Flipkart') {
        return url.replace(/\/image\/\d+\/\d+\//i, '/image/800/800/');
      }
    } catch (e) {
      console.warn("Error cleaning image URL", e);
    }
    return url;
  }

  if (isAmazon) {
    const cards = document.querySelectorAll('[data-component-type="s-search-result"], .p13n-sc-uncoverable-faceout, .vse-item, .sg-col-inner .s-card-container');
    
    cards.forEach(card => {
      try {
        const titleEl = card.querySelector('[data-cy="title-recipe"] h2 a span, h2 a span, .a-size-medium.a-color-base.a-text-normal, .a-size-base-plus.a-color-base.a-text-normal');
        let title = titleEl ? titleEl.innerText.trim() : '';

        const priceEl = card.querySelector('.a-price .a-offscreen, .a-price-whole, .p13n-sc-price');
        let priceValue = '';
        if (priceEl) {
          const rawText = priceEl.innerText || priceEl.textContent;
          priceValue = rawText.replace(/[^\d.]/g, '').split('.')[0]; 
        }
        let price = priceValue ? `₹${parseInt(priceValue).toLocaleString('en-IN')}` : '';

        const origPriceEl = card.querySelector('.a-text-price .a-offscreen, .a-text-strike, .a-price.a-text-price span');
        let origPriceValue = '';
        if (origPriceEl) {
          const rawText = origPriceEl.innerText || origPriceEl.textContent;
          origPriceValue = rawText.replace(/[^\d.]/g, '').split('.')[0];
        }
        let originalPrice = origPriceValue && origPriceValue !== priceValue ? `₹${parseInt(origPriceValue).toLocaleString('en-IN')}` : '';

        const imgEl = card.querySelector('img.s-image, img.p13n-product-image, img');
        let image = imgEl ? imgEl.src : '';

        let asin = card.getAttribute('data-asin') || '';
        let linkEl = card.querySelector('.a-link-normal[href*="/dp/"], .a-link-normal[href*="/gp/product/"], a[href*="/dp/"]');
        
        if (!asin && linkEl) {
          const match = linkEl.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
          if (match) asin = match[1];
        }
        
        let affiliateLink = '';
        if (asin) {
          affiliateLink = `https://www.amazon.in/dp/${asin}`;
        } else if (linkEl && linkEl.href) {
          affiliateLink = linkEl.href.split('?')[0].split('/ref=')[0];
        } else {
          affiliateLink = `https://www.amazon.in/s?k=${encodeURIComponent(title)}`;
        }

        if (amazonTag && affiliateLink.includes('amazon.in')) {
          const separator = affiliateLink.includes('?') ? '&' : '?';
          affiliateLink += `${separator}tag=${amazonTag}`;
        }

        image = getHighResImage(image, 'Amazon');
        if (asin && (!image || image.includes('base64') || image.includes('transparent'))) {
          image = `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg`;
        }

        title = title.trim();

        const descEl = card.querySelector('.a-size-base.a-color-secondary.s-line-clamp-2, .a-section .a-spacing-none .a-color-secondary');
        let description = descEl ? descEl.innerText.trim() : '';
        if (description.toLowerCase().includes('sponsored')) description = '';

        let category = 'Electronics';
        const urlLower = window.location.href.toLowerCase();
        if (urlLower.includes('fashion') || urlLower.includes('clothing') || urlLower.includes('shirt')) category = 'Fashion';
        else if (urlLower.includes('beauty') || urlLower.includes('makeup')) category = 'Beauty';
        else if (urlLower.includes('home') || urlLower.includes('kitchen')) category = 'Home & Kitchen';
        else if (urlLower.includes('watch')) category = 'Watches';

        if (title && title.length > 5 && affiliateLink) {
          products.push({
            title,
            fullTitle: title,
            image: image || 'generic.svg',
            price,
            originalPrice,
            description: description || title,
            brand: 'Amazon',
            platform: 'Amazon',
            affiliateLink,
            category,
            needsEnrichment: true
          });
        }
      } catch (e) {}
    });

    if (products.length > 0) {
      // Deep Extraction for Amazon Bulk
      const maxDeep = 10;
      products.length = Math.min(products.length, maxDeep);
      const delay = ms => new Promise(res => setTimeout(res, ms));
      for (const p of products) {
        if (p.affiliateLink) {
          try {
            await delay(800); // Prevent Amazon rate-limiting (Robot Check)
            const res = await fetch(p.affiliateLink);
            const html = await res.text();
            
            // Use DOMParser for safer and accurate extraction
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            
            // Extract Full Title securely
            const titleEl = doc.querySelector('#productTitle');
            if (titleEl && titleEl.innerText.trim().length > 5) {
                p.fullTitle = titleEl.innerText.trim();
                p.title = p.fullTitle;
            } else {
                p.invalid = true; // Failed to fetch actual product page (captcha or block)
                continue;
            }

            // Extract Images (Regex is still best for this as hiRes is stored in JS objects)
            let fetchedImages = [];
            const imgMatches = [...html.matchAll(/"hiRes"\s*:\s*"([^"]+)"/g)];
            if (imgMatches.length > 0) {
                fetchedImages = imgMatches.map(m => m[1]).slice(0, 12);
            } else {
                const largeMatches = [...html.matchAll(/"large"\s*:\s*"([^"]+)"/g)];
                if (largeMatches.length > 0) fetchedImages = largeMatches.map(m => m[1]).slice(0, 12);
            }
            if (fetchedImages.length > 0) {
                p.images = fetchedImages;
                p.image = fetchedImages[0];
            }

            // Extract Bullets securely using DOMParser to avoid matching irrelevant specs
            const bulletEls = doc.querySelectorAll('#feature-bullets .a-list-item');
            const bullets = Array.from(bulletEls)
                .map(el => el.innerText.trim())
                .filter(t => t.length > 15 && !t.toLowerCase().includes('sponsored'));
            if (bullets.length > 0) {
                p.description = bullets.slice(0, 10).join('\n\n');
            }
            
            p.needsEnrichment = false;
          } catch(e) {}
        }
      }
    } else {
      // Support for single product page
      try {
        const titleEl = document.querySelector('#productTitle');
        const priceEl = document.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .a-price-whole');
        const imgEl = document.querySelector('#landingImage, #imgBlkFront');
        
        if (titleEl && (priceEl || imgEl)) {
          let title = titleEl.innerText.trim();

          let priceValue = '';
          const priceSelectors = [
            '.a-price[data-a-color="price"] .a-offscreen',
            '.a-price .a-offscreen',
            '.a-price-whole',
            '#priceblock_ourprice',
            '#priceblock_dealprice',
            '#corePrice_feature_div .a-price .a-offscreen',
            '.priceToPay .a-price .a-offscreen',
            '#apex_desktop .a-price .a-offscreen'
          ];
          for (const sel of priceSelectors) {
            const el = document.querySelector(sel);
            if (el) {
              const raw = (el.innerText || el.textContent).replace(/[^\d.]/g, '').split('.')[0];
              if (raw && parseInt(raw) > 0) { priceValue = raw; break; }
            }
          }
          let price = priceValue ? `\u20b9${parseInt(priceValue).toLocaleString('en-IN')}` : '';
          let image = imgEl ? imgEl.src : '';
          
          const origPriceEl = document.querySelector('.a-price.a-text-price .a-offscreen, .basisPrice .a-offscreen, #listPrice');
          let origPriceValue = origPriceEl ? (origPriceEl.innerText || origPriceEl.textContent).replace(/[^\d.]/g, '').split('.')[0] : '';
          let originalPrice = origPriceValue && origPriceValue !== priceValue ? `\u20b9${parseInt(origPriceValue).toLocaleString('en-IN')}` : '';

          let description = '';
          const bulletSelectors = [
            '#feature-bullets .a-list-item',
            '#featurebullets_feature_div .a-list-item',
            '#productDescription p',
            '#productDescription',
            '.aplus-v2 .aplus-standard',
            '#bookDescription_feature_div',
            '#item_details_description'
          ];
          
          const blacklist = ['m.r.p', 'price:', 'you save', 'inclusive of', 'free delivery', 'in stock', 'sponsored', 'select delivery', 'ships from', 'sold by', 'checkout', 'add to cart', 'buy now', 'eligible for', 'return policy', 'customer reviews'];

          for (const sel of bulletSelectors) {
            const els = document.querySelectorAll(sel);
            if (els.length > 0) {
              const lines = Array.from(els)
                .map(el => el.innerText.trim())
                .filter(t => {
                  const tl = t.toLowerCase();
                  return t.length > 20 && !blacklist.some(b => tl.includes(b));
                })
                .slice(0, 15);
              
              if (lines.length > 0) {
                description = lines.join('\n\n');
                if (description.length > 250) break;
              }
            }
          }

          let images = [];
          const altImages = document.querySelectorAll('#altImages li img, #main-image-container li img');
          if (altImages.length > 0) {
            images = Array.from(altImages)
              .map(img => getHighResImage(img.src, 'Amazon'))
              .filter(src => src && !src.includes('base64') && !src.includes('transparent') && !src.includes('video-slate'))
              .slice(0, 12);
          }
          if (images.length === 0 && image) images = [image];

          if (!description) {
            const metaDesc = document.querySelector('meta[name="description"]')?.content;
            if (metaDesc && metaDesc.length > 50 && !metaDesc.toLowerCase().includes('sponsored')) {
              description = metaDesc;
            }
          }

          let asin = '';
          const asinEl = document.querySelector('#ASIN, input[name="ASIN"]');
          if (asinEl) asin = asinEl.value;
          
          let affiliateLink = window.location.href.split('?')[0].split('/ref=')[0];
          
          const siteStripeShort = document.querySelector('#amzn-ss-text-shortlink-textarea, .amzn-ss-text-shortlink-textarea');
          const siteStripeFull = document.querySelector('#amzn-ss-text-full-link-textarea, .amzn-ss-text-full-link-textarea');
          
          let isOfficial = false;
          if (siteStripeShort && siteStripeShort.value && siteStripeShort.value.includes('amzn.to')) {
            affiliateLink = siteStripeShort.value.trim();
            isOfficial = true;
          } else if (siteStripeFull && siteStripeFull.value && siteStripeFull.value.includes('tag=')) {
            affiliateLink = siteStripeFull.value.trim();
            isOfficial = true;
          } else if (amazonTag && !affiliateLink.includes('tag=')) {
            const separator = affiliateLink.includes('?') ? '&' : '?';
            affiliateLink += `${separator}tag=${amazonTag}`;
          }

          products.push({
            title: title.trim(),
            fullTitle: title.trim(),
            image: images[0] || getHighResImage(image, 'Amazon') || 'generic.svg',
            images: images.length > 0 ? images : [getHighResImage(image, 'Amazon')].filter(Boolean),
            price,
            originalPrice,
            description,
            brand: 'Amazon',
            platform: 'Amazon',
            affiliateLink,
            isOfficial, 
            category: 'Electronics',
            needsEnrichment: false
          });
        }
      } catch (e) {}
    }
  } else if (window.location.href.includes("flipkart.com")) {
    const isSingleProduct = !!document.querySelector('._2K67mX, ._35Ky56, .B_NuCI');
    
    if (isSingleProduct) {
      try {
        const titleEl = document.querySelector('.B_NuCI, ._35Ky56');
        const priceEl = document.querySelector('._30jeq3._16Jk6d');
        const origPriceEl = document.querySelector('._3I9_wc._27UcYP');
        const imgEls = document.querySelectorAll('._20Y_m6 img, ._396cs4._2amPTt, .q6DClP');
        
        if (titleEl) {
          const title = titleEl.innerText.trim();
          const price = priceEl ? priceEl.innerText.trim() : '';
          const originalPrice = origPriceEl ? origPriceEl.innerText.trim() : '';
          
          let images = Array.from(imgEls)
            .map(img => getHighResImage(img.src, 'Flipkart'))
            .filter(src => src && !src.includes('base64'))
            .slice(0, 12);
            
          if (images.length === 0) {
            const mainImg = document.querySelector('._396cs4._2amPTt, ._2r_T1I');
            if (mainImg) images = [getHighResImage(mainImg.src, 'Flipkart')];
          }

          const highlightEls = document.querySelectorAll('._2418kt li');
          let description = Array.from(highlightEls).map(el => el.innerText.trim()).join('\n\n');
          
          const descEl = document.querySelector('._1mXcCf, ._2u3t37');
          if (descEl) description += '\n\n' + descEl.innerText.trim();

          const affiliateLink = window.location.href.split('?')[0];

          products.push({
            title,
            fullTitle: title,
            image: images[0] || 'generic.svg',
            images: images,
            price,
            originalPrice,
            description: description || title,
            brand: 'Flipkart',
            platform: 'Flipkart',
            affiliateLink,
            category: 'Electronics',
            needsEnrichment: false
          });
        }
      } catch (e) {}
    }

    if (products.length === 0) {
      const cards = document.querySelectorAll('._1xFAF9, ._4ddWXP, ._2kHMtA, ._1AtVbE');
      cards.forEach(card => {
        try {
          const titleEl = card.querySelector('.s1Q9rs, ._4rR01T, .IRpwTa');
          let title = titleEl ? titleEl.innerText.trim() : '';

          const priceEl = card.querySelector('._30jeq3');
          let priceValue = priceEl ? priceEl.innerText.replace(/[^\d.]/g, '').split('.')[0] : '';
          let price = priceValue ? `₹${parseInt(priceValue).toLocaleString('en-IN')}` : '';

          const origPriceEl = card.querySelector('._3I9_wc');
          let origPriceValue = origPriceEl ? origPriceEl.innerText.replace(/[^\d.]/g, '').split('.')[0] : '';
          let originalPrice = origPriceValue ? `₹${parseInt(origPriceValue).toLocaleString('en-IN')}` : '';

          const imgEl = card.querySelector('img._396cs4, img._2r_T1I, img');
          let image = imgEl ? imgEl.src : '';
          image = getHighResImage(image, 'Flipkart');

          const linkEl = card.querySelector('a._1fQZEK, a._2rpwqI, a._2Uzu_n');
          let affiliateLink = linkEl ? linkEl.href.split('?')[0] : '';

          if (title && (price || image)) {
            products.push({
              title,
              fullTitle: title,
              image,
              images: [image].filter(Boolean),
              price,
              originalPrice,
              description: title,
              brand: 'Flipkart',
              platform: 'Flipkart',
              affiliateLink,
              category: 'Electronics',
              needsEnrichment: true
            });
          }
        } catch (e) {}
      });
      
      if (products.length > 0) {
        // Deep Extraction for Flipkart Bulk
        const maxDeep = 10;
        products.length = Math.min(products.length, maxDeep);
        for (const p of products) {
          if (p.affiliateLink) {
            try {
              const res = await fetch(p.affiliateLink);
              const html = await res.text();
              
              const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]+?)<\/script>/i);
              if (nextDataMatch && nextDataMatch[1]) {
                  const nd = JSON.parse(nextDataMatch[1]);
                  const pdp = nd?.props?.pageProps?.initialData?.data?.getProductDetails?.productDetails 
                            ?? nd?.props?.pageProps?.RESPONSE?.data?.productDetails 
                            ?? nd?.props?.pageProps?.pageData?.productListing 
                            ?? nd?.props?.pageProps;
                  
                  if (pdp) {
                      const fkTitle = pdp.title ?? pdp.primaryInfo?.title ?? pdp.productName ?? pdp.name;
                      if (fkTitle) {
                          p.fullTitle = fkTitle;
                          p.title = fkTitle;
                      }
                      
                      const imgs = pdp.images ?? pdp.media?.images ?? pdp.imageUrls;
                      if (imgs) {
                          const fetchedImages = (Array.isArray(imgs) ? imgs.map(i => i.url || i) : [imgs])
                              .map(url => getHighResImage(url, 'Flipkart'))
                              .slice(0, 12);
                          if (fetchedImages.length > 0) {
                              p.images = fetchedImages;
                              p.image = fetchedImages[0];
                          }
                      }

                      const highlights = pdp.highlights;
                      if (Array.isArray(highlights)) {
                          p.description = highlights.map(h => h.text).filter(Boolean).join('\n\n');
                      }
                      p.needsEnrichment = false;
                  } else {
                      p.invalid = true;
                  }
              } else {
                  p.invalid = true;
              }
            } catch(e) {}
          }
        }
      }
    }
  }

  const uniqueProducts = [];
  const titles = new Set();
  for (const p of products) {
    if (p.invalid) continue; // Skip products that failed deep extraction
    if (!titles.has(p.title)) {
      titles.add(p.title);
      if (manualLink) p.affiliateLink = manualLink;
      uniqueProducts.push(p);
    }
  }

  return uniqueProducts;
})();
