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

function scrapeSingleProduct() {
  const url = window.location.href;
  const isAmazon = url.includes('amazon');
  const isFlipkart = url.includes('flipkart');

  const data = {
    title: '', price: '', originalPrice: '', discount: '',
    images: [], features: [], specifications: {},
    brand: '', rating: '4.5', reviews: '0', url: window.location.href
  };

  if (isAmazon) {
    data.title = document.querySelector('#productTitle')?.innerText.trim();
    data.price = document.querySelector('.a-price-whole')?.innerText.trim();
    data.originalPrice = document.querySelector('.a-text-strike')?.innerText.trim();
    data.discount = document.querySelector('.savingsPercentage')?.innerText.trim();
    data.brand = document.querySelector('#bylineInfo')?.innerText.trim().replace('Brand: ', '');
    
    document.querySelectorAll('#altImages img').forEach(img => {
      const src = img.src.replace(/\._AC_.*_\./, '.');
      if (src && !src.includes('video') && !data.images.includes(src)) data.images.push(src);
    });

    document.querySelectorAll('#feature-bullets li span').forEach(li => {
      const txt = li.innerText.trim();
      if (txt) data.features.push(txt);
    });

    document.querySelectorAll('#productDetails_techSpec_section_1 tr').forEach(tr => {
      const key = tr.querySelector('th')?.innerText.trim();
      const val = tr.querySelector('td')?.innerText.trim();
      if (key && val) data.specifications[key] = val;
    });
  }

  if (isFlipkart) {
    data.title = document.querySelector('.B_NuCI')?.innerText.trim();
    data.price = document.querySelector('._30jeq3._16Jk6d')?.innerText.trim();
    data.originalPrice = document.querySelector('._3I9_wc._27W-Wc')?.innerText.trim();
    data.discount = document.querySelector('._3Ay6Sb._31DcoD')?.innerText.trim();
    
    document.querySelectorAll('._206H7Z img, ._396cs4 img').forEach(img => {
       const src = img.src.replace(/q=\d+/, 'q=90');
       if (src && !data.images.includes(src)) data.images.push(src);
    });

    document.querySelectorAll('._2418kt li').forEach(li => data.features.push(li.innerText.trim()));
    document.querySelectorAll('._14u39f tr').forEach(tr => {
      const key = tr.querySelector('._1hKm9u')?.innerText.trim();
      const val = tr.querySelector('._2vZqPX')?.innerText.trim();
      if (key && val) data.specifications[key] = val;
    });
  }

  return data;
}

// ---- SMART COLLECTOR LOGIC ----

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'sc-toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function injectButtons() {
    const isAmazon = window.location.href.includes('amazon');
    const isFlipkart = window.location.href.includes('flipkart');

    if (isAmazon) {
        const items = document.querySelectorAll('[data-component-type="s-search-result"]');
        items.forEach(item => {
            if (item.querySelector('.sc-import-btn')) return;
            const container = item.querySelector('.s-product-image-container');
            if (container) {
                const btn = document.createElement('button');
                btn.className = 'sc-import-btn';
                btn.innerHTML = '⚡ Import';
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const data = scrapeProducts().find(p => p.title === item.querySelector('h2 a span')?.innerText.trim());
                    if (data) collectProduct(data, btn);
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
            if (img && img.parentElement) {
                const btn = document.createElement('button');
                btn.className = 'sc-import-btn';
                btn.innerHTML = '⚡ Import';
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const title = item.querySelector('._4rR01T, .ir_0P_ , ._2WkVRV')?.innerText.trim();
                    const data = scrapeProducts().find(p => p.title === title);
                    if (data) collectProduct(data, btn);
                };
                img.parentElement.appendChild(btn);
            }
        });
    }
}

async function collectProduct(data, btn) {
    try {
        const { sc_collected = [] } = await chrome.storage.local.get('sc_collected');
        // Check for duplicates
        if (sc_collected.find(p => p.url === data.url)) {
            showToast("Already Collected!");
            return;
        }
        
        sc_collected.push(data);
        await chrome.storage.local.set({ sc_collected });
        
        btn.innerHTML = '✓ Added';
        btn.classList.add('sc-collected');
        showToast("Product Collected! Open Admin to sync.");
    } catch (e) {
        console.error("Collection failed", e);
    }
}

// Sync with SmartChoose Admin
async function syncWithAdmin() {
    if (window.location.href.includes('smartchoose.in/admin')) {
        const { sc_collected = [] } = await chrome.storage.local.get('sc_collected');
        if (sc_collected.length > 0) {
            // Send data to the page using postMessage
            window.postMessage({ type: 'SC_SYNC_DATA', data: sc_collected }, '*');
        }
    }
}

// Initialize
if (window.location.href.includes('amazon') || window.location.href.includes('flipkart')) {
    setInterval(injectButtons, 2000);
}

if (window.location.href.includes('smartchoose.in')) {
    setInterval(syncWithAdmin, 3000);
    
    // Listen for clear message from page
    window.addEventListener('message', async (event) => {
        if (event.data?.type === 'SC_CLEAR_COLLECTED') {
            await chrome.storage.local.set({ sc_collected: [] });
            showToast("Sync Successful!");
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    sendResponse(scrapeProducts());
  }
});
