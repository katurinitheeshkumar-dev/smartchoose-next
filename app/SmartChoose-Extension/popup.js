// SmartChoose Extension Popup v3.0
let scrapedData = [];

// Load saved Tag
const tagInput = document.getElementById('amazonTag');
chrome.storage.local.get(['amazonTag'], (res) => {
  tagInput.value = res.amazonTag || 'smartthingste-21';
  if (!res.amazonTag) {
    chrome.storage.local.set({ amazonTag: 'smartthingste-21' });
  }
});

// Save Tag on change
tagInput.addEventListener('input', (e) => {
  chrome.storage.local.set({ amazonTag: e.target.value });
});

// ── Extract Button ────────────────────────────────────────────────────────────
document.getElementById('extractBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const isAmazon = tab.url.includes('amazon.in');
  const isFlipkart = tab.url.includes('flipkart.com');

  if (!isAmazon && !isFlipkart) {
    setStatus('❌ Please open an Amazon.in or Flipkart.com page first!', 'error');
    return;
  }

  setStatus('⏳ <b>Deep Extracting up to 20 Products...</b><br><small>Fetching full details, images & descriptions. Wait 30–60 sec.</small>', 'info');
  document.getElementById('extractBtn').disabled = true;

  const tag = tagInput.value.trim();
  const manualAff = document.getElementById('manualAffiliate').value.trim();

  // Step 1: inject global variables
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (amazonTag, manualLink) => {
      window.SMARTCHOOSE_AMAZON_TAG = amazonTag;
      window.SMARTCHOOSE_MANUAL_LINK = manualLink;
    },
    args: [tag, manualAff]
  });

  // Step 2: run scraper
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['scraper.js']
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      setStatus('❌ Extension error: ' + chrome.runtime.lastError.message, 'error');
      document.getElementById('extractBtn').disabled = false;
      return;
    }

    if (!results || !results[0] || results[0].result == null) {
      setStatus('❌ Could not read the page. Try refreshing and try again.', 'error');
      document.getElementById('extractBtn').disabled = false;
      return;
    }

    scrapedData = results[0].result;

    if (!Array.isArray(scrapedData) || scrapedData.length === 0) {
      setStatus('⚠️ No products found on this page.<br><small>Try scrolling down to load more products, then click Extract again.</small>', 'warn');
      document.getElementById('extractBtn').disabled = false;
      return;
    }

    setStatus(`✅ Found <b>${scrapedData.length}</b> product${scrapedData.length > 1 ? 's' : ''}!`, 'success');
    document.getElementById('extractBtn').style.display = 'none';
    document.getElementById('sendBtn').style.display = 'block';

    // Show product list preview
    const ul = document.getElementById('productList');
    ul.innerHTML = '';
    scrapedData.slice(0, 15).forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = `<span style="color:#10b981;font-weight:bold;">${p.price || '—'}</span> ${p.title}`;
      ul.appendChild(li);
    });
  });
});

// ── Send Button ───────────────────────────────────────────────────────────────
document.getElementById('sendBtn').addEventListener('click', () => {
  if (!scrapedData || scrapedData.length === 0) return;

  const dataString = JSON.stringify(scrapedData);
  navigator.clipboard.writeText(dataString).then(() => {
    setStatus(
      `✅ <b>${scrapedData.length} products copied!</b><br>` +
      `<small>Now click <b>"Paste Extension Data"</b> in the Admin Panel.</small>`,
      'success'
    );
    document.getElementById('sendBtn').innerText = '🚀 Open Admin Panel';
    document.getElementById('sendBtn').onclick = () => {
      chrome.tabs.create({ url: 'https://smartchoose.in/admin/products' });
    };
  }).catch(() => {
    // Fallback: try manual copy
    const ta = document.createElement('textarea');
    ta.value = dataString;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    setStatus('✅ Copied! Click <b>Paste Extension Data</b> in Admin Panel.', 'success');
  });
});

// ── Helper ────────────────────────────────────────────────────────────────────
function setStatus(html, type) {
  const el = document.getElementById('status');
  el.innerHTML = html;
  el.className = 'status status-' + type;
}
