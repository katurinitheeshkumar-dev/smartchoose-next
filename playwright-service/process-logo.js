const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const htmlPath = path.resolve(__dirname, '../app/remove-bg.html');
    await page.goto(`file://${htmlPath}`);
    await page.waitForFunction('!!window.resultDataUrl', { timeout: 10000 });
    const dataUrl = await page.evaluate('window.resultDataUrl');
    
    // Convert to buffer
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Overwrite the logo files in app/public
    fs.writeFileSync(path.resolve(__dirname, '../app/public/logo.png'), buffer);
    fs.writeFileSync(path.resolve(__dirname, '../app/public/logo192.png'), buffer);
    fs.writeFileSync(path.resolve(__dirname, '../app/public/logo512.png'), buffer);
    
    await browser.close();
    console.log("Successfully converted fallback logos to pure transparent PNGs!");
  } catch (error) {
    console.error("Error generating transparent logo:", error);
    process.exit(1);
  }
})();
