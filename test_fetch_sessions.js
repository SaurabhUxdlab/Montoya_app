const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBrl--daJ01uaW06WqcIBAtOubbFriVaDY",
  authDomain: "montaya-tennis.firebaseapp.com",
  projectId: "montaya-tennis",
  storageBucket: "montaya-tennis.firebasestorage.app",
  messagingSenderId: "752477033977",
  appId: "1:752477033977:web:d3e028f0ff990de69dd928",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const collections = ['sessions', 'lessons', 'bookings', 'venues'];
  for (const col of collections) {
    try {
      console.log(`\n=== Collection: ${col} ===`);
      const snap = await getDocs(collection(db, col));
      console.log(`Found ${snap.size} docs:`);
      snap.forEach((d) => {
        console.log(`\nDoc ID: ${d.id}`);
        console.log(JSON.stringify(d.data(), null, 2));
      });
    } catch (err) {
      console.log(`Col ${col} error:`, err.message);
    }
  }
  process.exit(0);
}

main();
