const FIREBASE_PROJECT = 'smartchoose-official';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

async function audit() {
    console.log(`Auditing collection: blogPosts in project: ${FIREBASE_PROJECT}...`);
    const res = await fetch(`${BASE_URL}/blogPosts?pageSize=200`);
    const data = await res.json();
    
    if (!data.documents) {
        console.log('❌ COLLECTION IS EMPTY in REST API!');
        return;
    }

    console.log(`✅ FOUND ${data.documents.length} DOCUMENTS:`);
    data.documents.forEach(doc => {
        const slug = doc.name.split('/').pop();
        const status = doc.fields?.status?.stringValue || 'no status';
        const title = doc.fields?.title?.stringValue || 'no title';
        console.log(`- [ ${status.toUpperCase()} ] ${slug} (${title})`);
    });
}

audit();
