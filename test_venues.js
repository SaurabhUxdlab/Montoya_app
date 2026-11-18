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
  try {
    console.log('Fetching venues...');
    const snap = await getDocs(collection(db, 'venues'));
    console.log(`Found ${snap.size} venues:`);
    for (const d of snap.docs) {
      console.log(`\nVenue ID: ${d.id}`);
      console.log(JSON.stringify(d.data(), null, 2));

      // Fetch courts subcollection
      const courtsSnap = await getDocs(collection(db, 'venues', d.id, 'courts'));
      console.log(`  Courts in ${d.id}: ${courtsSnap.size}`);
      courtsSnap.forEach(cd => {
        console.log(`    Court ID: ${cd.id}, data:`, JSON.stringify(cd.data()));
      });
    }

    console.log('\nFetching attendance...');
    const attSnap = await getDocs(collection(db, 'attendance'));
    console.log(`Found ${attSnap.size} attendance records:`);
    attSnap.forEach(d => {
      console.log(`\nAttendance Doc ID: ${d.id}`);
      console.log(JSON.stringify(d.data(), null, 2));
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
