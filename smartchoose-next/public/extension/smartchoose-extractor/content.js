function scrapeProducts() {
  const url = window.location.href;
  const isAmazon = url.includes('amazon');
  const isFlipkart = url.includes('flipkart');

  // Check if we are on a search or category page
  const isAmazonSearch = isAmazon && (url.includes('/s?') || url.includes('/b?') || url.includes('/browse/') || document.querySelector('[data-component-type="s-search-result"]'));
  const isFlipkartSearch = isFlipkart && (url.includes('/search?') || url.includes('/p/') === false && document.querySelector('._1AtVbE'));

  if (isAmazonSearch) {
    const results = [];
    const items = document.querySelectorAll('[data-component-type="s-search-result"]');
    items.forEach((item, index) => {
      if (index >= 40) return; // Scrape more in background
      const titleEl = item.querySelector('h2 a span');
      const priceEl = item.querySelector('.a-price-whole');
      const imgEl = item.querySelector('img.s-image');
      const linkEl = item.querySelector('h2 a');
      
      if (titleEl && priceEl) {
        results.push({
          title: titleEl.innerText.trim(),
          price: priceEl.innerText.trim(),
          images: [imgEl?.src].filter(Boolean),
          url: linkEl?.href ? new URL(linkEl.href, window.location.origin).href : '',
          platform: 'Amazon'
        });
      }
    });
    if (results.length > 0) return results;
  }

  if (isFlipkartSearch) {
    const results = [];
    let items = document.querySelectorAll('._1AtVbE ._13oc-S');
    if (items.length === 0) items = document.querySelectorAll('._4ddWXP, ._1xHGtK');

    items.forEach((item, index) => {
      if (index >= 40) return;
      const titleEl = item.querySelector('._4rR01T, .ir_0P_ , ._2WkVRV');
      const priceEl = item.querySelector('._30jeq3');
      const imgEl = item.querySelector('img');
      const linkEl = item.querySelector('a');
      
      if (titleEl && priceEl) {
        results.push({
          title: titleEl.innerText.trim(),
          price: priceEl.innerText.trim(),
          images: [imgEl?.src].filter(Boolean),
          url: linkEl?.href ? new URL(linkEl.href, window.location.origin).href : '',
          platform: 'Flipkart'
        });
      }
    });
    if (results.length > 0) return results;
  }

  return scrapeSingleProduct();
}

function scrapeSingleProduct(doc = document, url = window.location.href) {
  const isAmazon = url.includes('amazon');
  const isFlipkart = url.includes('flipkart');

  const data = {
    title: '', price: '', originalPrice: '', discount: '',
    images: [], features: [], specifications: {},
    brand: '', rating: '4.5', reviews: '0', url: url
  };

  if (isAmazon) {
    data.title = doc.querySelector('#productTitle')?.innerText.trim();
    data.price = doc.querySelector('.a-price-whole')?.innerText.trim();
    data.originalPrice = doc.querySelector('.a-text-strike')?.innerText.trim();
    data.discount = doc.querySelector('.savingsPercentage')?.innerText.trim();
    data.brand = doc.querySelector('#bylineInfo')?.innerText.trim().replace('Brand: ', '');
    
    doc.querySelectorAll('#altImages img').forEach(img => {
      const src = img.src.replace(/\._AC_.*_\./, '.');
      if (src && !src.includes('video') && !data.images.includes(src)) data.images.push(src);
    });

    doc.querySelectorAll('#feature-bullets li span').forEach(li => {
      const txt = li.innerText.trim();
      if (txt) data.features.push(txt);
    });

    doc.querySelectorAll('#productDetails_techSpec_section_1 tr').forEach(tr => {
      const key = tr.querySelector('th')?.innerText.trim();
      const val = tr.querySelector('td')?.innerText.trim();
      if (key && val) data.specifications[key] = val;
    });
  }

  if (isFlipkart) {
    data.title = doc.querySelector('.B_NuCI')?.innerText.trim();
    data.price = doc.querySelector('._30jeq3._16Jk6d')?.innerText.trim();
    data.originalPrice = doc.querySelector('._3I9_wc._27W-Wc')?.innerText.trim();
    data.discount = doc.querySelector('._3Ay6Sb._31DcoD')?.innerText.trim();
    
    doc.querySelectorAll('._206H7Z img, ._396cs4 img').forEach(img => {
       const src = img.src.replace(/q=\d+/, 'q=90');
       if (src && !data.images.includes(src)) data.images.push(src);
    });

    doc.querySelectorAll('._2418kt li').forEach(li => data.features.push(li.innerText.trim()));
    doc.querySelectorAll('._14u39f tr').forEach(tr => {
      const key = tr.querySelector('._1hKm9u')?.innerText.trim();
      const val = tr.querySelector('._2vZqPX')?.innerText.trim();
      if (key && val) data.specifications[key] = val;
    });
  }

  // Ensure high quality images (min 6 if possible)
  if (data.images.length > 0) {
      data.images = data.images.map(img => {
          if (isAmazon) return img.replace(/\._AC_.*_\./, '._AC_SL1500_.');
          if (isFlipkart) return img.replace(/q=\d+/, 'q=90');
          return img;
      }).slice(0, 10);
  }

  return data;
}

// ---- SMART COLLECTOR LOGIC ----

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'sc-toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

async function fetchDeepData(url) {
    try {
        const res = await fetch(url);
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return scrapeSingleProduct(doc, url);
    } catch (e) {
        console.error("Deep fetch failed for " + url, e);
        return null;
    }
}

function injectButtons() {
    const isAmazon = window.location.href.includes('amazon');
    const isFlipkart = window.location.href.includes('flipkart');
    const url = window.location.href;

    const isSearch = isAmazon && (url.includes('/s?') || url.includes('/b?') || url.includes('/browse/')) || 
                     isFlipkart && (url.includes('/search?') || url.includes('/p/') === false);

    if (isSearch && !document.getElementById('sc-bulk-collect')) {
        const btn = document.createElement('button');
        btn.id = 'sc-bulk-collect';
        btn.className = 'sc-bulk-btn';
        btn.innerHTML = '🚀 Deep Collect First 10 (Full Data + 6+ Images)';
        btn.onclick = async () => {
            btn.innerHTML = '⏳ Scraping... Please wait (~15s)';
            btn.classList.add('sc-loading');
            
            const results = scrapeProducts();
            const targets = results.slice(0, 10);
            let count = 0;
            
            for (const item of targets) {
                if (item.url) {
                    const deepData = await fetchDeepData(item.url);
                    if (deepData && deepData.title) {
                        await collectProduct(deepData);
                        count++;
                    }
                }
            }
            
            btn.innerHTML = '✅ Done! Collected ' + count + ' items';
            btn.classList.remove('sc-loading');
            showToast(`Deep Sync Complete! ${count} items added to collector.`);
            setTimeout(() => { btn.innerHTML = '🚀 Deep Collect First 10 (Full Data + 6+ Images)'; }, 3000);
        };
        document.body.appendChild(btn);
    }

    if (isAmazon) {
        const items = document.querySelectorAll('[data-component-type="s-search-result"]');
        items.forEach(item => {
            if (item.querySelector('.sc-import-btn')) return;
            const container = item.querySelector('.s-product-image-container');
            if (container) {
                const btn = document.createElement('button');
                btn.className = 'sc-import-btn';
                btn.innerHTML = '⚡ Import';
                btn.onclick = async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    btn.innerHTML = '⏳';
                    const link = item.querySelector('h2 a')?.href;
                    if (link) {
                        const deepData = await fetchDeepData(link);
                        if (deepData) collectProduct(deepData, btn);
                    }
                };
                container.appendChild(btn);
            }
        });
    }

    if (isFlipkart) {
        const items = document.querySelectorAll('._1AtVbE ._13oc-S, ._4ddWXP, ._1xHGtK');
        items.forEach(item => {
            if (item.querySelector('.sc-import-btn')) return;
            const img = item.querySelector('img');
            const link = item.querySelector('a')?.href;
            if (img && img.parentElement && link) {
                const btn = document.createElement('button');
                btn.className = 'sc-import-btn';
                btn.innerHTML = '⚡ Import';
                btn.onclick = async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    btn.innerHTML = '⏳';
                    const deepData = await fetchDeepData(link);
                    if (deepData) collectProduct(deepData, btn);
                };
                img.parentElement.appendChild(btn);
            }
        });
    }
}

async function collectProduct(data, btn = null) {
    try {
        const { sc_collected = [] } = await chrome.storage.local.get('sc_collected');
        if (sc_collected.find(p => p.url === data.url)) {
            if (btn) { btn.innerHTML = '✓'; btn.classList.add('sc-collected'); }
            return;
        }
        
        sc_collected.push(data);
        await chrome.storage.local.set({ sc_collected });
        
        if (btn) {
            btn.innerHTML = '✓ Added';
            btn.classList.add('sc-collected');
            showToast("Product Collected with High Quality Images!");
        }
    } catch (e) {
        console.error("Collection failed", e);
    }
}

// Sync with SmartChoose Admin
async function syncWithAdmin() {
    if (window.location.href.includes('smartchoose.in/admin')) {
        const { sc_collected = [] } = await chrome.storage.local.get('sc_collected');
        if (sc_collected.length > 0) {
            window.postMessage({ type: 'SC_SYNC_DATA', data: sc_collected }, '*');
        }
    }
}

// Initialize
if (window.location.href.includes('amazon') || window.location.href.includes('flipkart')) {
    setInterval(injectButtons, 2500);
}

if (window.location.href.includes('smartchoose.in')) {
    setInterval(syncWithAdmin, 3000);
    window.addEventListener('message', async (event) => {
        if (event.data?.type === 'SC_CLEAR_COLLECTED') {
            await chrome.storage.local.set({ sc_collected: [] });
            showToast("Bulk Sync Successful!");
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    sendResponse(scrapeProducts());
  }
});
