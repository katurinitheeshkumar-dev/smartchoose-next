async function testMagicFill() {
  const proxyBaseUrl = 'https://smartchoose-proxy.vercel.app/api/fetch-product';

  console.log('✨ Running Magic AI Fill (Enrichment) with CORRECT payload wrapper...');
  try {
    const enrichRes = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'enrich',
        product: {
            title: 'Samsung Galaxy M35 5G (Daybreak Blue, 6GB RAM, 128GB Storage)',
            brand: 'Samsung',
            category: 'Smartphones',
            description: 'Samsung Galaxy M35 5G with 6000mAh battery and Super AMOLED display.'
        }
      })
    });

    const text = await enrichRes.text();
    if (!enrichRes.ok) {
        console.error('❌ Proxy Error:', text);
        return;
    }

    const enrichedData = JSON.parse(text);
    console.log('✅ Success! Data enriched.');
    console.log('Title:', enrichedData.data.title);
  } catch (err) {
    console.error('❌ Test Failed:', err.message);
  }
}

testMagicFill();
