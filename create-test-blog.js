const FIREBASE_PROJECT = 'smartchoose-official';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

function toFirestore(data) {
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'boolean') fields[k] = { booleanValue: v };
        else if (typeof v === 'number') fields[k] = { doubleValue: v };
        else if (Array.isArray(v)) {
            fields[k] = {
                arrayValue: {
                    values: v.map(item => {
                        if (item && typeof item === 'object') return { mapValue: toFirestore(item) };
                        return { stringValue: String(item) };
                    })
                }
            };
        } else if (v && typeof v === 'object') {
            fields[k] = { mapValue: toFirestore(v) };
        } else {
            fields[k] = { stringValue: String(v) };
        }
    }
    return { fields };
}

async function createTest() {
    const slug = 'ai-magic-restored-' + Date.now();
    const post = {
        id: slug,
        slug: slug,
        title: "🚀 AI Magic is Officially Restored!",
        status: "published",
        intro: "The SmartChoose AI Automation is now bulletproof and syncing perfectly with Firestore.",
        content: "<p>We have successfully upgraded the AI Blog pipeline. This post confirms that the <b>Firestore Sync</b> is working correctly and visibility is restored.</p>",
        featuredImage: "https://firebasestorage.googleapis.com/v0/b/smartchoose-official.appspot.com/o/blog%2Fai-success.png?alt=media",
        category: "Tech",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        template: "standard",
        products: []
    };

    console.log(`Syncing test post: ${slug}...`);
    const res = await fetch(`${BASE_URL}/blogPosts?documentId=${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toFirestore(post))
    });

    if (res.ok) {
        console.log(`✅ SUCCESS! Check: https://smartchoose.in/blog/${slug}`);
    } else {
        const err = await res.text();
        console.error(`❌ FAILED: ${res.status} - ${err}`);
    }
}

createTest();
