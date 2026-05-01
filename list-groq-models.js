const GROQ_API_KEY = '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';

async function listModels() {
    console.log('Querying Groq Models...');
    try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
        });
        const data = await res.json();
        console.log('Current Models:');
        data.data.forEach(m => console.log(`- ${m.id}`));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listModels();
