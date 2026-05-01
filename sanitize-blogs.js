const FIREBASE_PROJECT = 'smartchoose-official';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

async function sanitize() {
    console.log('--- SCANNING FOR CORRUPT DOCUMENTS ---');
    try {
        const res = await fetch(`${BASE_URL}/blogPosts?pageSize=200`);
        const data = await res.json();
        
        if (!data.documents) {
            console.log('Collection is empty.');
            return;
        }

        console.log(`Analyzing ${data.documents.length} documents...`);

        for (const doc of data.documents) {
            const slug = doc.name.split('/').pop();
            const fields = doc.fields || {};
            
            let issues = [];
            if (!fields.id) issues.push('Missing ID');
            if (!fields.status) issues.push('Missing Status');
            if (!fields.createdAt) issues.push('Missing createdAt');
            if (!fields.slug) issues.push('Missing slug');

            if (issues.length > 0) {
                console.log(`⚠️ CORRUPT: ${slug} -> [${issues.join(', ')}]`);
                // Auto-fix if possible
                if (!fields.id || !fields.status || !fields.createdAt) {
                    console.log(`🔧 Auto-repairing ${slug}...`);
                    const fixedFields = {
                        ...fields,
                        id: fields.id || { stringValue: slug },
                        status: fields.status || { stringValue: 'published' },
                        createdAt: fields.createdAt || { stringValue: new Date().toISOString() },
                        updatedAt: fields.updatedAt || { stringValue: new Date().toISOString() }
                    };

                    await fetch(`${BASE_URL}/blogPosts/${slug}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fields: fixedFields })
                    });
                    console.log(`✅ Fixed ${slug}`);
                }
            } else {
                console.log(`✨ HEALTHY: ${slug}`);
            }
        }
        console.log('--- SCAN COMPLETE ---');
    } catch (e) {
        console.error('Scan failed:', e.message);
    }
}

sanitize();
