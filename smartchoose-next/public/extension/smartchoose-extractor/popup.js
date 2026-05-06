async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('amazon') && !tab.url.includes('flipkart')) {
    document.getElementById('status').innerText = "Please visit Amazon or Flipkart.";
    document.getElementById('copy-btn').disabled = true;
    return;
  }

  document.getElementById('status').innerText = "Extracting data...";

  chrome.tabs.sendMessage(tab.id, { action: "scrape" }, (response) => {
    if (response) {
      const isBulk = Array.isArray(response);
      const count = isBulk ? response.length : 1;
      
      document.getElementById('status').innerText = `Success! ${count} Product${count > 1 ? 's' : ''} Found.`;
      document.getElementById('data-preview').style.display = 'block';
      document.getElementById('data-preview').innerText = JSON.stringify(response, null, 2).substring(0, 500) + (JSON.stringify(response).length > 500 ? '...' : '');
      
      document.getElementById('copy-btn').onclick = () => {
        navigator.clipboard.writeText(JSON.stringify(response));
        document.getElementById('copy-btn').innerText = "Copied!";
        setTimeout(() => { document.getElementById('copy-btn').innerText = `Copy ${count} Product${count > 1 ? 's' : ''}`; }, 2000);
      };
      document.getElementById('copy-btn').innerText = `Copy ${count} Product${count > 1 ? 's' : ''}`;
    } else {
      document.getElementById('status').innerText = "Failed to extract. Refresh page.";
    }
  });
}

init();
