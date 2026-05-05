async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('amazon') && !tab.url.includes('flipkart')) {
    document.getElementById('status').innerText = "Please visit Amazon or Flipkart.";
    document.getElementById('copy-btn').disabled = true;
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "scrape" }, (response) => {
    if (response) {
      document.getElementById('status').innerText = "Data Extracted Successfully!";
      document.getElementById('data-preview').style.display = 'block';
      document.getElementById('data-preview').innerText = JSON.stringify(response, null, 2);
      
      document.getElementById('copy-btn').onclick = () => {
        navigator.clipboard.writeText(JSON.stringify(response));
        document.getElementById('copy-btn').innerText = "Copied!";
        setTimeout(() => { document.getElementById('copy-btn').innerText = "Copy JSON Data"; }, 2000);
      };
    } else {
      document.getElementById('status').innerText = "Failed to extract. Refresh page.";
    }
  });
}

init();
