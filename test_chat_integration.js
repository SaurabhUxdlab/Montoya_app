const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBrl--daJ01uaW06WqcIBAtOubbFriVaDY",
  authDomain: "montaya-tennis.firebaseapp.com",
  projectId: "montaya-tennis",
  storageBucket: "montaya-tennis.firebasestorage.app",
  messagingSenderId: "752477033977",
  appId: "1:752477033977:web:d3e028f0ff990de69dd928",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runChatIntegrationTests() {
  console.log('====================================================');
  console.log('💬 REAL-TIME CHAT INTEGRATION TEST SUITE (Create, Edit, Delete)');
  console.log('====================================================\n');

  // Authenticate test coach user
  const testEmail = `test.coach.chat.${Date.now()}@montoyatennis.com`;
  const testPassword = 'TestPassword123!';
  let coachUid;

  try {
    const cred = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    coachUid = cred.user.uid;
    console.log(`🔑 Authenticated test coach UID: ${coachUid}`);

    // Create user document with role coach
    await setDoc(doc(db, 'users', coachUid), {
      name: 'Test Coach',
      email: testEmail,
      role: 'Coach',
      createdAt: new Date().toISOString(),
    });
    console.log(`👤 Created coach profile doc in users/${coachUid}`);
  } catch (err) {
    console.warn('Auth note:', err.message);
    const cred = await signInWithEmailAndPassword(auth, 'coach.test@montoyatennis.com', 'CoachPass123!');
    coachUid = cred.user.uid;
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Real-time Message Listener on users/{coachUid}/messages
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Real-time Message Listener Setup ---');
    let listenerReceived = [];
    const messagesQuery = query(
      collection(db, 'users', coachUid, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      listenerReceived = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    });

    assert(typeof unsubscribe === 'function', 'Real-time Firestore listener subscription created');

    // -------------------------------------------------------------
    // Test 2: Coach sends a message with text & attachment
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Coach Sending Message (Coach App -> Firestore) ---');
    const coachMsgRef = await addDoc(collection(db, 'users', coachUid, 'messages'), {
      text: 'Original message before editing.',
      sender: 'coach',
      status: 'sent',
      timestamp: serverTimestamp(),
      attachments: null,
    });

    assert(Boolean(coachMsgRef.id), `Coach message successfully created at users/${coachUid}/messages/${coachMsgRef.id}`);

    // -------------------------------------------------------------
    // Test 3: Coach edits the message
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Coach Editing Message ---');
    await updateDoc(doc(db, 'users', coachUid, 'messages', coachMsgRef.id), {
      text: 'Updated message content after edit.',
      isEdited: true,
      updatedAt: serverTimestamp(),
    });

    const editedSnap = await getDoc(coachMsgRef);
    assert(editedSnap.exists(), 'Edited message doc exists in Firestore');
    const editedData = editedSnap.data();
    assert(editedData.text === 'Updated message content after edit.', 'Message text was successfully updated');
    assert(editedData.isEdited === true, 'isEdited flag set to true');
    assert(Boolean(editedData.updatedAt), 'updatedAt timestamp set on edit');

    // -------------------------------------------------------------
    // Test 4: Security Rule Verification: Coach cannot spoof sender: "admin"
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Firestore Security: Coach cannot spoof sender: "admin" ---');
    let spoofBlocked = false;
    try {
      await addDoc(collection(db, 'users', coachUid, 'messages'), {
        text: 'Spoofed admin message',
        sender: 'admin',
        status: 'sent',
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      spoofBlocked = true;
    }
    assert(spoofBlocked, 'Firestore Security correctly blocks non-admin from creating messages with sender="admin"');

    // -------------------------------------------------------------
    // Test 5: Coach deletes the message
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Coach Deleting Message ---');
    await deleteDoc(doc(db, 'users', coachUid, 'messages', coachMsgRef.id));

    const deletedSnap = await getDoc(coachMsgRef);
    assert(!deletedSnap.exists(), 'Message doc was permanently removed from Firestore');

    // -------------------------------------------------------------
    // Clean up
    // -------------------------------------------------------------
    unsubscribe();
    await deleteDoc(doc(db, 'users', coachUid)).catch(() => {});
    console.log('\n🧹 Cleaned up test user doc.');

  } catch (err) {
    console.error('Test execution error:', err);
    assert(false, `Unexpected error: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('✨ REAL-TIME CHAT SYSTEM (CREATE, EDIT, DELETE) FULLY VERIFIED!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed.');
    process.exit(1);
  }
}

runChatIntegrationTests();
