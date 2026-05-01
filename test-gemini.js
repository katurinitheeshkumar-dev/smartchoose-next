const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyD7kWC8z8q77xLiyP49GiZJohqh-MuIXfE`;
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: "Identify a viral, trending 2026 tech or home lifestyle topic for SmartChoose.in. RETURN ONLY JSON: { \"title\": \"...\", \"reason\": \"...\", \"keywords\": [\"...\",...] }" }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
  })
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(err => console.error(err));
