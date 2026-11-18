const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
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

// Helper for assertions
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

async function runNotificationIntegrationTests() {
  console.log('====================================================');
  console.log('🔔 IN-APP & FCM NOTIFICATION INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  // Authenticate test runner
  const testEmail = `test.notifier.${Date.now()}@montoyatennis.com`;
  const testPassword = 'TestPassword123!';
  let testUserUid;

  try {
    const cred = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    testUserUid = cred.user.uid;
    console.log(`🔑 Authenticated test user UID: ${testUserUid}`);
  } catch (err) {
    console.warn('Auth note:', err.message);
    testUserUid = `test_coach_${Date.now()}`;
  }

  const coachA_Id = testUserUid;
  const coachB_Id = `coach_b_isolation_${Date.now()}`;

  // ----------------------------------------------------
  // SUITE 1: FCM Token Registration in Firestore
  // ----------------------------------------------------
  console.log('\n--- SUITE 1: FCM Token Registration in users/{userId}/fcmTokens ---');
  const sampleFcmToken = `fcm_token_device_test_hash_${Date.now()}`;
  const tokenDocId = encodeURIComponent(sampleFcmToken.slice(-32));
  const tokenDocRef = doc(db, 'users', coachA_Id, 'fcmTokens', tokenDocId);

  await setDoc(tokenDocRef, {
    token: sampleFcmToken,
    platform: 'android',
    updatedAt: new Date().toISOString(),
  });

  const savedTokenSnap = await getDoc(tokenDocRef);
  assert(savedTokenSnap.exists(), 'FCM Device Token record created in users/{uid}/fcmTokens subcollection');
  assert(savedTokenSnap.data().token === sampleFcmToken, 'Token string matches registered device token');
  assert(savedTokenSnap.data().platform === 'android', 'Platform field recorded as "android"');

  // ----------------------------------------------------
  // SUITE 2: In-App Notification Creation (Dashboard / Cloud Function Schema)
  // ----------------------------------------------------
  console.log('\n--- SUITE 2: In-App Notification Creation & Schema ---');
  const notif1Ref = doc(collection(db, 'users', coachA_Id, 'notifications'));
  const notif2Ref = doc(collection(db, 'users', coachA_Id, 'notifications'));
  const notif3Ref = doc(collection(db, 'users', coachA_Id, 'notifications'));

  // Notification 1: Booking assigned
  await setDoc(notif1Ref, {
    title: 'New Session Assigned',
    body: 'You have been assigned to coach Rafael Nadal on September 18 at 5:00 PM at Court 1.',
    type: 'booking_created',
    targetId: 'session_nadal_001',
    targetScreen: 'Schedule',
    read: false,
    createdAt: new Date().toISOString(),
  });

  // Notification 2: Schedule change
  await setDoc(notif2Ref, {
    title: 'Schedule Updated',
    body: 'Your coaching session on September 18 has been moved to Court 3.',
    type: 'COURT_REASSIGNED',
    targetId: 'session_nadal_001',
    targetScreen: 'Schedule',
    read: false,
    createdAt: new Date(Date.now() - 60000).toISOString(),
  });

  // Notification 3: Attendance approved
  await setDoc(notif3Ref, {
    title: 'Attendance Approved',
    body: 'Your shift check-in on Sep 17 has been approved by Admin.',
    type: 'attendance_approved',
    targetId: 'att_record_999',
    targetScreen: 'CheckIn',
    read: false,
    createdAt: new Date(Date.now() - 120000).toISOString(),
  });

  const notifsListSnap = await getDocs(collection(db, 'users', coachA_Id, 'notifications'));
  assert(notifsListSnap.docs.length >= 3, 'Coach A successfully retrieved created in-app notifications');

  const createdNotif1 = notifsListSnap.docs.find((d) => d.id === notif1Ref.id)?.data();
  assert(createdNotif1.title === 'New Session Assigned', 'Notification title properly stored');
  assert(createdNotif1.type === 'booking_created', 'Notification type matches Dashboard event type');
  assert(createdNotif1.targetScreen === 'Schedule', 'Deep-link targetScreen set to "Schedule"');
  assert(createdNotif1.read === false, 'Notification initially unread (read: false)');

  // ----------------------------------------------------
  // SUITE 3: Unread Count Calculation
  // ----------------------------------------------------
  console.log('\n--- SUITE 3: Unread Badge Count Calculation ---');
  const allCoachANotifs = notifsListSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const unreadCount = allCoachANotifs.filter((n) => !n.read).length;
  assert(unreadCount >= 3, `Unread count computed correctly: ${unreadCount} unread items`);

  // ----------------------------------------------------
  // SUITE 4: Mark Notification As Read (Single & Batch)
  // ----------------------------------------------------
  console.log('\n--- SUITE 4: Mark As Read Flow ---');
  // Mark Notification 1 as read
  await updateDoc(doc(db, 'users', coachA_Id, 'notifications', notif1Ref.id), {
    read: true,
    updatedAt: new Date().toISOString(),
  });

  const updatedNotif1Snap = await getDoc(notif1Ref);
  assert(updatedNotif1Snap.data().read === true, 'Notification 1 successfully marked as read in Firestore');

  // Verify unread count decreases
  const afterReadSnap = await getDocs(collection(db, 'users', coachA_Id, 'notifications'));
  const remainingUnread = afterReadSnap.docs.filter((d) => !d.data().read).length;
  assert(remainingUnread === unreadCount - 1, `Unread count reduced by 1 to: ${remainingUnread}`);

  // Batch mark all remaining as read
  const unreadDocs = afterReadSnap.docs.filter((d) => !d.data().read);
  const batch = writeBatch(db);
  unreadDocs.forEach((d) => {
    batch.update(d.ref, { read: true, updatedAt: new Date().toISOString() });
  });
  await batch.commit();

  const finalNotifsSnap = await getDocs(collection(db, 'users', coachA_Id, 'notifications'));
  const zeroUnread = finalNotifsSnap.docs.filter((d) => !d.data().read).length;
  assert(zeroUnread === 0, 'Mark all as read reduced unread count to 0');

  // ----------------------------------------------------
  // SUITE 5: Recipient Coach Isolation & Security
  // ----------------------------------------------------
  console.log('\n--- SUITE 5: Coach-Specific Recipient Isolation & Security Rules ---');
  let crossWriteBlocked = false;
  try {
    // Attempt to write into another user's notification subcollection (must be rejected by Firestore rules)
    const notifBRef = doc(collection(db, 'users', coachB_Id, 'notifications'));
    await setDoc(notifBRef, {
      title: 'Private Lesson for Coach B',
      body: 'Only Coach B should see this notification.',
      type: 'private_lesson_assigned',
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err.code === 'permission-denied') {
      crossWriteBlocked = true;
    }
  }

  assert(crossWriteBlocked, 'Firestore Security Rules actively block Coach A from writing/tampering with Coach B notifications');

  let crossReadBlocked = false;
  try {
    // Attempt to read another user's notifications (must be rejected by Firestore rules)
    await getDocs(collection(db, 'users', coachB_Id, 'notifications'));
  } catch (err) {
    if (err.code === 'permission-denied') {
      crossReadBlocked = true;
    }
  }

  assert(crossReadBlocked, 'Firestore Security Rules actively block Coach A from reading Coach B notifications (Strict Isolation)');

  // ----------------------------------------------------
  // SUITE 6: Cleanup Test Data
  // ----------------------------------------------------
  console.log('\n--- SUITE 6: Cleanup Test Artifacts ---');
  try {
    await deleteDoc(tokenDocRef);
    await deleteDoc(notif1Ref);
    await deleteDoc(notif2Ref);
    await deleteDoc(notif3Ref);
    console.log('  🧹 Cleaned up temporary test documents.');
  } catch (cleanErr) {
    console.warn('Cleanup error:', cleanErr.message);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  process.exit(passed === total ? 0 : 1);
}

runNotificationIntegrationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
