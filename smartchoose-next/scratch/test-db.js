
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDXgUU4_JoeraAgNAsHshXfI5KXvLqTkic",
    authDomain: "smartchoose-official.firebaseapp.com",
    projectId: "smartchoose-official",
    storageBucket: "smartchoose-official.firebasestorage.app",
    messagingSenderId: "523324606856",
    appId: "1:523324606856:web:50134b90e4dea65311523d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const id = 'sc-1777546205493-6x9kt451b';
  console.log(`Checking product: ${id}`);
  try {
    const snap = await getDoc(doc(db, 'products', id));
    if (snap.exists()) {
      console.log('SUCCESS: Product found!');
      console.log('Title:', snap.data().title);
    } else {
      console.log('FAIL: Product NOT found in Firestore.');
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  process.exit();
}

check();
