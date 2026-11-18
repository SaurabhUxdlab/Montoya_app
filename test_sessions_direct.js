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

async function test() {
  console.log('Fetching sessions collection directly...');
  const snap = await getDocs(collection(db, 'sessions'));
  console.log(`Successfully fetched ${snap.size} sessions!`);
  snap.forEach(d => {
    console.log(` - ID: ${d.id}, Player: ${d.data().playerName}, Coach: ${d.data().assignedCoachId} (${d.data().assignedCoachName})`);
  });
  process.exit(0);
}

test().catch(err => {
  console.error('Error fetching sessions:', err);
  process.exit(1);
});
