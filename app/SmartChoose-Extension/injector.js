// Runs on smartchoose.in
// Bridges Chrome Extension Storage to the Webpage's LocalStorage

function injectData(dataArray) {
  if (dataArray && dataArray.length > 0) {
    window.localStorage.setItem("sc_import_queue", JSON.stringify(dataArray));
    console.log("✅ SmartChoose Extension: Injected " + dataArray.length + " products into localStorage!");
    
    // Clear the extension storage so it doesn't loop
    chrome.storage.local.remove("sc_pending_import");
  }
}

// 1. Check on load
chrome.storage.local.get("sc_pending_import", (res) => {
  injectData(res.sc_pending_import);
});

// 2. Continuous listener (in case user already has the tab open)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.sc_pending_import && changes.sc_pending_import.newValue) {
    injectData(changes.sc_pending_import.newValue);
  }
});
