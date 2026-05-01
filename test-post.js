const https = require('https');

const postData = JSON.stringify({
    title: "Test Blog from AI",
    slug: "test-blog-ai-" + Date.now(),
    intro: "Testing the AI automation pipeline.",
    content: "This is a test blog post content generated to debug the 500 error.",
    category: "Gadgets",
    featuredImage: "https://images.unsplash.com/photo-1546868871-70c2020a57e2",
    products: [{
        id: "test-prod-1",
        name: "Test Smartwatch",
        price: "₹1,999",
        image: "https://images.unsplash.com/photo-1546868871-70c2020a57e2",
        description: "A test product description.",
        pros: ["Pro 1", "Pro 2"],
        cons: ["Con 1"],
        affiliateLink: "https://amazon.in",
        smartChooseId: "test-prod-1"
    }]
});

const options = {
  hostname: 'smartchoose-proxy.vercel.app',
  path: '/api/ai-blog-helper?action=create-post',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing Proxy Create-Post API...');

const req = https.request(options, (res) => {
  let body = '';
  console.log(`Status Code: ${res.statusCode}`);
  res.on('data', (d) => body += d);
  res.on('end', () => {
    console.log('Response Body:');
    try {
        console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch(e) {
        console.log(body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.write(postData);
req.end();
