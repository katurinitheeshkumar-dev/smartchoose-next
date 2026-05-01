const GROQ_API_KEY = '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';

async function testGroq() {
    console.log('Testing Groq AI...');
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${GROQ_API_KEY}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: "Say hello and return a JSON object: {\"msg\": \"hi\"}" }],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

testGroq();
