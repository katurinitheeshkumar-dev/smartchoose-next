function scrapeProduct() {
  const url = window.location.href;
  const isAmazon = url.includes('amazon');
  const isFlipkart = url.includes('flipkart');

  const data = {
    title: '',
    price: '',
    originalPrice: '',
    discount: '',
    images: [],
    features: [],
    specifications: {},
    brand: '',
    rating: '4.5',
    reviews: '0'
  };

  if (isAmazon) {
    data.title = document.querySelector('#productTitle')?.innerText.trim();
    data.price = document.querySelector('.a-price-whole')?.innerText.trim();
    data.originalPrice = document.querySelector('.a-text-strike')?.innerText.trim();
    data.discount = document.querySelector('.savingsPercentage')?.innerText.trim();
    data.brand = document.querySelector('#bylineInfo')?.innerText.trim().replace('Brand: ', '');
    
    // Images
    const imgEls = document.querySelectorAll('#altImages img');
    imgEls.forEach(img => {
      const src = img.src.replace(/\._AC_.*_\./, '.');
      if (src && !src.includes('video') && !data.images.includes(src)) data.images.push(src);
    });

    // Features
    document.querySelectorAll('#feature-bullets li span').forEach(li => {
      const txt = li.innerText.trim();
      if (txt) data.features.push(txt);
    });

    // Specs
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
    
    // Images
    document.querySelectorAll('._206H7Z img, ._396cs4 img').forEach(img => {
       const src = img.src.replace(/q=\d+/, 'q=90');
       if (src && !data.images.includes(src)) data.images.push(src);
    });

    // Features
    document.querySelectorAll('._2418kt li').forEach(li => {
      data.features.push(li.innerText.trim());
    });

    // Specs
    document.querySelectorAll('._14u39f tr').forEach(tr => {
      const key = tr.querySelector('._1hKm9u')?.innerText.trim();
      const val = tr.querySelector('._2vZqPX')?.innerText.trim();
      if (key && val) data.specifications[key] = val;
    });
  }

  return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    sendResponse(scrapeProduct());
  }
});
