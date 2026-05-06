function scrapeProducts() {
  const url = window.location.href;
  const isAmazon = url.includes('amazon');
  const isFlipkart = url.includes('flipkart');

  const results = [];
  if (isAmazon) {
    const items = document.querySelectorAll('[data-component-type="s-search-result"], .s-result-item[data-asin]');
    items.forEach((item) => {
      const titleEl = item.querySelector('h2 a span, .a-size-medium.a-color-base.a-text-normal, .a-size-base-plus.a-color-base.a-text-normal');
      const priceEl = item.querySelector('.a-price-whole, .a-price .a-offscreen');
      const linkEl = item.querySelector('h2 a, .a-link-normal.s-no-outline');
      const imgEl = item.querySelector('img.s-image');
      
      if (titleEl && linkEl) {
        results.push({
          title: titleEl.innerText.trim(),
          price: priceEl?.innerText.trim() || '000',
          url: new URL(linkEl.getAttribute('href'), window.location.origin).href,
          platform: 'Amazon',
          image: imgEl?.src || ''
        });
      }
    });
  }

  if (isFlipkart) {
    const items = document.querySelectorAll('._1AtVbE ._13oc-S, ._4ddWXP, ._1xHGtK, ._2kHMtA');
    items.forEach((item) => {
      const titleEl = item.querySelector('._4rR01T, .ir_0P_ , ._2WkVRV, .s1Q9rs');
      const priceEl = item.querySelector('._30jeq3, ._25b18c ._30jeq3');
      const linkEl = item.querySelector('a._1fQ64c, a._2rpS_f, a.s1Q9rs, a._2UzhPZ');
      const imgEl = item.querySelector('img');
      
      if (titleEl && linkEl) {
        results.push({
          title: titleEl.innerText.trim(),
          price: priceEl?.innerText.trim() || '000',
          url: new URL(linkEl.getAttribute('href'), window.location.origin).href,
          platform: 'Flipkart',
          image: imgEl?.src || ''
        });
      }
    });
  }

  return results.length > 0 ? results : scrapeSingleProduct();
}

function scrapeSingleProduct(doc = document, url = window.location.href) {
  const isAmazon = url.includes('amazon');
  const isFlipkart = url.includes('flipkart');

  const data = {
    title: '', price: '', originalPrice: '', discount: '',
    images: [], features: [], specifications: {},
    brand: '', rating: '4.5', reviews: '0', url: url, category: 'Electronics'
  };

  try {
    if (isAmazon) {
      data.title = (doc.querySelector('#productTitle') || doc.querySelector('.qa-title-text'))?.innerText.trim();
      data.price = (doc.querySelector('.a-price-whole') || doc.querySelector('#priceblock_ourprice'))?.innerText.trim();
      data.originalPrice = doc.querySelector('.a-text-strike')?.innerText.trim();
      data.discount = doc.querySelector('.savingsPercentage')?.innerText.trim();
      data.brand = (doc.querySelector('#bylineInfo') || doc.querySelector('#brand'))?.innerText.trim().replace('Brand: ', '');
      
      // Get all images
      const imgList = [];
      doc.querySelectorAll('#altImages img, #imgTagWrapperId img, .a-spacing-small img').forEach(img => {
        let src = img.src || img.getAttribute('data-old-hires') || img.getAttribute('data-a-dynamic-image');
        if (src && src.startsWith('{')) { // Amazon dynamic image JSON
            try { src = Object.keys(JSON.parse(src))[0]; } catch(e) {}
        }
        if (src && !src.includes('video') && !src.includes('play-button')) {
            src = src.replace(/\._AC_.*_\./, '._AC_SL1500_.'); // Force High Res
            if (!imgList.includes(src)) imgList.push(src);
        }
      });
      data.images = imgList.slice(0, 10);

      doc.querySelectorAll('#feature-bullets li span, .a-list-item').forEach(li => {
        const txt = li.innerText.trim();
        if (txt && txt.length > 10) data.features.push(txt);
      });

      doc.querySelectorAll('tr.a-spacing-small, .prodDetTable tr').forEach(tr => {
        const key = tr.querySelector('th, .prodDetSectionEntry')?.innerText.trim();
        const val = tr.querySelector('td')?.innerText.trim();
        if (key && val) data.specifications[key] = val;
      });
    }

    if (isFlipkart) {
      data.title = (doc.querySelector('.B_NuCI') || doc.querySelector('.yhB1nd'))?.innerText.trim();
      data.price = (doc.querySelector('._30jeq3._16Jk6d') || doc.querySelector('._30jeq3'))?.innerText.trim();
      data.originalPrice = doc.querySelector('._3I9_wc._27W-Wc')?.innerText.trim();
      data.discount = doc.querySelector('._3Ay6Sb._31DcoD')?.innerText.trim();
      
      const imgList = [];
      doc.querySelectorAll('._206H7Z img, ._396cs4 img, ._2amPTt img').forEach(img => {
         let src = img.src;
         if (src) {
             src = src.replace(/q=\d+/, 'q=90').replace(/\d+\/\d+\//, '1000/1000/'); 
             if (!imgList.includes(src)) imgList.push(src);
         }
      });
      data.images = imgList.slice(0, 10);

      doc.querySelectorAll('._2418kt li, ._21Ahn-').forEach(li => data.features.push(li.innerText.trim()));
      doc.querySelectorAll('._14u39f tr, ._3_60ls tr').forEach(tr => {
        const key = tr.querySelector('._1hKm9u, ._2H_S7e')?.innerText.trim();
        const val = tr.querySelector('._2vZqPX, ._3ds9vB')?.innerText.trim();
        if (key && val) data.specifications[key] = val;
      });
    }
  } catch (e) { console.error("Scrape failed", e); }

  return data;
}

// ---- SMART COLLECTOR LOGIC ----

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'sc-toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchDeepData(url) {
    try {
        await sleep(Math.random() * 1000 + 500); // Human-like delay
        const res = await fetch(url);
        if (!res.ok) throw new Error("Fetch failed");
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return scrapeSingleProduct(doc, url);
    } catch (e) { 
        console.error("Deep fetch failed", e);
        return null; 
    }
}

function injectButtons() {
    const url = window.location.href;
    const isSearch = url.includes('/s?') || url.includes('/search?') || url.includes('/b?') || url.includes('/browse/') || (!url.includes('/dp/') && !url.includes('/p/'));

    if (isSearch && !document.getElementById('sc-bulk-collect')) {
        const btn = document.createElement('button');
        btn.id = 'sc-bulk-collect';
        btn.className = 'sc-bulk-btn';
        btn.innerHTML = '🚀 Deep Import First 10 (Full Data + HD Images)';
        btn.onclick = async () => {
            const results = scrapeProducts();
            const targets = results.filter(r => r.url).slice(0, 10);
            if (targets.length === 0) { showToast("No products found on page!"); return; }
            
            btn.innerHTML = `⏳ Scraping 0/${targets.length}...`;
            btn.classList.add('sc-loading');
            
            let count = 0;
            for (const item of targets) {
                const deepData = await fetchDeepData(item.url);
                if (deepData && deepData.title) {
                    await collectProduct(deepData);
                    count++;
                    btn.innerHTML = `⏳ Scraping ${count}/${targets.length}...`;
                }
            }
            
            btn.innerHTML = `✅ Sync ${count} Items in Admin`;
            btn.classList.remove('sc-loading');
            showToast(`Success! ${count} products with full details ready to sync.`);
        };
        document.body.appendChild(btn);
    }

    // Individual buttons
    const amazonItems = document.querySelectorAll('[data-component-type="s-search-result"], .s-result-item[data-asin]');
    amazonItems.forEach(item => {
        if (item.querySelector('.sc-import-btn')) return;
        const container = item.querySelector('.s-product-image-container, .a-section.a-spacing-base');
        const link = item.querySelector('h2 a')?.href;
        if (container && link) {
            const btn = document.createElement('button');
            btn.className = 'sc-import-btn';
            btn.innerHTML = '⚡ Import';
            btn.onclick = async (e) => {
                e.preventDefault(); e.stopPropagation();
                btn.innerHTML = '⏳';
                const deepData = await fetchDeepData(link);
                if (deepData) collectProduct(deepData, btn);
            };
            container.style.position = 'relative';
            container.appendChild(btn);
        }
    });

    const flipkartItems = document.querySelectorAll('._1AtVbE ._13oc-S, ._4ddWXP, ._1xHGtK, ._2kHMtA');
    flipkartItems.forEach(item => {
        if (item.querySelector('.sc-import-btn')) return;
        const imgContainer = item.querySelector('._2rpS_f, ._396cs4, ._2amPTt');
        const link = item.querySelector('a')?.href;
        if (imgContainer && link) {
            const btn = document.createElement('button');
            btn.className = 'sc-import-btn';
            btn.innerHTML = '⚡ Import';
            btn.onclick = async (e) => {
                e.preventDefault(); e.stopPropagation();
                btn.innerHTML = '⏳';
                const deepData = await fetchDeepData(link);
                if (deepData) collectProduct(deepData, btn);
            };
            imgContainer.style.position = 'relative';
            imgContainer.appendChild(btn);
        }
    });
}

async function collectProduct(data, btn = null) {
    if (!chrome.runtime?.id) return; 
    try {
        const { sc_collected = [] } = await chrome.storage.local.get('sc_collected');
        if (sc_collected.find(p => p.url === data.url)) {
            if (btn) { btn.innerHTML = '✓'; btn.classList.add('sc-collected'); }
            return;
        }
        sc_collected.push(data);
        await chrome.storage.local.set({ sc_collected });
        if (btn) { btn.innerHTML = '✓ Added'; btn.classList.add('sc-collected'); }
    } catch (e) { console.error(e); }
}

async function syncWithAdmin() {
    if (!chrome.runtime?.id) return;
    if (window.location.href.includes('smartchoose.in/admin')) {
        try {
            const { sc_collected = [] } = await chrome.storage.local.get('sc_collected');
            if (sc_collected.length > 0) {
                window.postMessage({ type: 'SC_SYNC_DATA', data: sc_collected }, '*');
            }
        } catch (e) {}
    }
}

if (window.location.href.includes('amazon') || window.location.href.includes('flipkart')) {
    setInterval(injectButtons, 3000);
}

if (window.location.href.includes('smartchoose.in')) {
    setInterval(syncWithAdmin, 4000);
    window.addEventListener('message', async (event) => {
        if (!chrome.runtime?.id) return;
        if (event.data?.type === 'SC_CLEAR_COLLECTED') {
            try { await chrome.storage.local.set({ sc_collected: [] }); } catch(e) {}
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") sendResponse(scrapeProducts());
});
