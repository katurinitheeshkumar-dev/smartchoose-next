const FIREBASE_PROJECT = 'smartchoose-official';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

async function check() {
    const res = await fetch(`${BASE_URL}/blogPosts/rodeiz-men-checkered-casual-blue-shirt-review`);
    const data = await res.json();
    console.log('--- RAW DATA FOR: rodeiz-men-checkered-casual-blue-shirt-review ---');
    console.log(JSON.stringify(data, null, 2));
}

check();
