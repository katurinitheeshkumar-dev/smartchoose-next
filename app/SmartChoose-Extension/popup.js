// Load saved Tag
const tagInput = document.getElementById('amazonTag');
chrome.storage.local.get(['amazonTag'], (res) => {
  if (res.amazonTag) {
    tagInput.value = res.amazonTag;
  } else {
    // Default tag from user
    tagInput.value = 'smartthingste-21';
    chrome.storage.local.set({ amazonTag: 'smartthingste-21' });
  }
});

// Save Tag on change
tagInput.addEventListener('input', (e) => {
  chrome.storage.local.set({ amazonTag: e.target.value });
});

document.getElementById('extractBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes("amazon.in") && !tab.url.includes("flipkart.com")) {
    document.getElementById('status').innerText = "❌ Please go to an Amazon or Flipkart page first!";
    return;
  }

  document.getElementById('status').innerHTML = "⏳ <b>Deep Extracting 100% Full Data...</b><br/><small>Please wait 5-10 seconds for background fetch.</small>";
  document.getElementById('extractBtn').disabled = true;

  const tag = tagInput.value.trim();
  const manualAff = document.getElementById('manualAffiliate').value.trim();

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (amazonTag, manualLink) => {
      // Set global variables for scraper.js to pick up
      window.SMARTCHOOSE_AMAZON_TAG = amazonTag;
      window.SMARTCHOOSE_MANUAL_LINK = manualLink;
    },
    args: [tag, manualAff]
  }, () => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scraper.js']
    }, (results) => {
      if (chrome.runtime.lastError || !results || !results[0].result) {
        document.getElementById('status').innerText = "❌ Error extracting data.";
        document.getElementById('extractBtn').disabled = false;
        return;
      }

      scrapedData = results[0].result;
      
      if (scrapedData.length === 0) {
        document.getElementById('status').innerText = "⚠️ No products found. Scroll down and try again.";
        document.getElementById('extractBtn').disabled = false;
        return;
      }

      document.getElementById('status').innerHTML = `✅ Found <b>${scrapedData.length}</b> products!`;
      document.getElementById('extractBtn').style.display = 'none';
      document.getElementById('sendBtn').style.display = 'block';

      const ul = document.getElementById('productList');
      ul.innerHTML = '';
      scrapedData.forEach(p => {
        const li = document.createElement('li');
        li.innerText = p.title;
        ul.appendChild(li);
      });
    });
  });
});

document.getElementById('sendBtn').addEventListener('click', () => {
  if (scrapedData.length === 0) return;
  
  // 100% Foolproof method: Copy to clipboard
  const dataString = JSON.stringify(scrapedData);
  navigator.clipboard.writeText(dataString).then(() => {
    document.getElementById('status').innerHTML = "✅ Copied! Now click <b>Paste Extension Data</b> in Admin Panel.";
    document.getElementById('sendBtn').innerText = "Open Admin Panel";
    
    // Change button behavior to just open the panel next click
    document.getElementById('sendBtn').onclick = () => {
      chrome.tabs.create({ url: "https://smartchoose.in/admin/products" });
    };
  }).catch(e => {
    document.getElementById('status').innerText = "❌ Failed to copy to clipboard.";
  });
});
