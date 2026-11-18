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
    console.log('Fetching schedules...');
    const snap = await getDocs(collection(db, 'schedules'));
    console.log(`Found ${snap.size} schedules:`);
    snap.forEach((d) => {
      console.log(`\nDoc ID: ${d.id}`);
      console.log(JSON.stringify(d.data(), null, 2));
    });

    console.log('\nFetching coaches...');
    const coachSnap = await getDocs(collection(db, 'coaches'));
    console.log(`Found ${coachSnap.size} coaches:`);
    coachSnap.forEach((d) => {
      console.log(`\nCoach Doc ID: ${d.id}`);
      console.log(JSON.stringify(d.data(), null, 2));
    });

    console.log('\nFetching users...');
    const userSnap = await getDocs(collection(db, 'users'));
    console.log(`Found ${userSnap.size} users:`);
    userSnap.forEach((d) => {
      console.log(`\nUser Doc ID: ${d.id}`);
      console.log(JSON.stringify(d.data(), null, 2));
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
