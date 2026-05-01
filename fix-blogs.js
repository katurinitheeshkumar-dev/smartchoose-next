const FIREBASE_PROJECT = 'smartchoose-official';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

async function fixInvisibleBlogs() {
    console.log('--- REPAIRING INVISIBLE BLOG POSTS ---');
    try {
        const res = await fetch(`${BASE_URL}/blogPosts?pageSize=200`);
        const data = await res.json();
        
        if (!data.documents) {
            console.log('No blog posts found to fix.');
            return;
        }

        for (const doc of data.documents) {
            const slug = doc.name.split('/').pop();
            const fields = doc.fields || {};
            
            // If internal 'id' field is missing, add it
            if (!fields.id) {
                console.log(`Fixing post: ${slug}...`);
                const updatedFields = {
                    ...fields,
                    id: { stringValue: slug }
                };

                const patchRes = await fetch(`${BASE_URL}/blogPosts/${slug}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fields: updatedFields })
                });

                if (patchRes.ok) console.log(`✅ Successfully restored: ${slug}`);
                else console.log(`❌ Failed to fix ${slug}: ${patchRes.status}`);
            } else {
                console.log(`Post [ ${slug} ] is healthy.`);
            }
        }
        console.log('--- REPAIR COMPLETE! ---');
    } catch (e) {
        console.error('Repair failed:', e.message);
    }
}

fixInvisibleBlogs();
