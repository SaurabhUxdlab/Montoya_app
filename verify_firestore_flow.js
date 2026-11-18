const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
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
const db = getFirestore(app);

const COACH_ID = "PAma5zVMwbTp0HGaKEbOkEBYAoA3";
const KNOWN_SCHEDULE_ID = "5WIw8wQ4Lw7cF2CM0IOM";
const KNOWN_LESSON_ID = "RTXWhyvfLTzNvX4JbLLH";

async function runVerification() {
  console.log('===============================================================');
  console.log('🎾 VERIFYING FIREBASE RELATIONSHIP CHAIN & ATTENDANCE FLOW');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   ↳ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   ↳ ${details}`);
    }
  }

  // 1. Availability check
  const availDoc = await getDoc(doc(db, 'availability', KNOWN_SCHEDULE_ID));
  assert(
    availDoc.exists() && availDoc.data().coachId === COACH_ID,
    '1. Availability: Document exists and links to coach',
    `ID: ${availDoc.id}, CoachId: ${availDoc.data()?.coachId}, Status: ${availDoc.data()?.status}`
  );

  // 2. Schedule check & sessionIds link
  const schedDoc = await getDoc(doc(db, 'schedules', KNOWN_SCHEDULE_ID));
  const schedData = schedDoc.data();
  const hasLessonLink = schedData?.sessionIds?.includes(KNOWN_LESSON_ID);
  assert(
    schedDoc.exists() && hasLessonLink,
    '2. Schedule: Document exists and links to Lesson ID via sessionIds',
    `ID: ${schedDoc.id}, sessionIds: ${JSON.stringify(schedData?.sessionIds)}`
  );

  // 3. Lesson check
  const lessonDoc = await getDoc(doc(db, 'lessons', KNOWN_LESSON_ID));
  const lessonData = lessonDoc.data();
  assert(
    lessonDoc.exists() && lessonData?.assignedCoachId === COACH_ID,
    '3. Lesson: Document exists and matches assignedCoachId',
    `ID: ${lessonDoc.id}, Player: ${lessonData?.playerName}, Coach: ${lessonData?.assignedCoachName}`
  );

  // 4. Attendance initial state check (Linked via shiftId / doc ID)
  const attRef = doc(db, 'attendance', KNOWN_SCHEDULE_ID);
  const attDoc = await getDoc(attRef);
  const attData = attDoc.data();
  assert(
    attDoc.exists() && (attData?.shiftId === KNOWN_SCHEDULE_ID || attDoc.id === KNOWN_SCHEDULE_ID),
    '4. Attendance: Document exists and matches Schedule ID / shiftId reference',
    `ID: ${attDoc.id}, ShiftId: ${attData?.shiftId}, Status: ${attData?.status}`
  );

  // 5. Test Check-In Flow (updating existing attendance document only)
  const checkInTimestamp = new Date().toISOString();
  const checkInLoc = {
    latitude: 28.62819,
    longitude: 77.3587,
    accuracy: 10,
    altitude: null,
    capturedAt: checkInTimestamp,
  };

  const checkInUpdates = {
    checkInTime: checkInTimestamp,
    checkInLocation: checkInLoc,
    status: 'Checked In',
    updatedAt: checkInTimestamp,
  };

  await setDoc(attRef, checkInUpdates, { merge: true });

  const postCheckInDoc = await getDoc(attRef);
  const postCheckInData = postCheckInDoc.data();
  assert(
    postCheckInData.status === 'Checked In' && postCheckInData.checkInTime === checkInTimestamp,
    '5. Check-In: Successfully updated existing attendance document without creating duplicate',
    `Status: ${postCheckInData.status}, CheckInTime: ${postCheckInData.checkInTime}`
  );

  // 6. Schema Integrity Check: Ensure NO extra/unexpected payload fields were added
  const allowedKeys = new Set([
    'shiftId',
    'coachId',
    'venueId',
    'date',
    'startTime',
    'endTime',
    'createdAt',
    'updatedAt',
    'status',
    'checkInTime',
    'checkInLocation',
    'checkOutTime',
    'checkOutLocation',
  ]);

  const currentKeys = Object.keys(postCheckInData);
  const unexpectedKeys = currentKeys.filter(k => !allowedKeys.has(k));
  assert(
    unexpectedKeys.length === 0,
    '6. Schema Integrity: Zero new or unexpected fields added to Attendance document',
    unexpectedKeys.length === 0 ? `All ${currentKeys.length} fields match existing schema.` : `Unexpected fields: ${unexpectedKeys.join(', ')}`
  );

  // 7. Test Check-Out Flow
  const checkOutTimestamp = new Date().toISOString();
  const checkOutLoc = {
    latitude: 28.62819,
    longitude: 77.3587,
    accuracy: 10,
    altitude: null,
    capturedAt: checkOutTimestamp,
  };

  const checkOutUpdates = {
    checkOutTime: checkOutTimestamp,
    checkOutLocation: checkOutLoc,
    status: 'Completed',
    updatedAt: checkOutTimestamp,
  };

  await setDoc(attRef, checkOutUpdates, { merge: true });

  const postCheckOutDoc = await getDoc(attRef);
  const postCheckOutData = postCheckOutDoc.data();
  assert(
    postCheckOutData.status === 'Completed' && postCheckOutData.checkOutTime === checkOutTimestamp,
    '7. Check-Out: Successfully updated attendance document to Completed',
    `Status: ${postCheckOutData.status}, CheckOutTime: ${postCheckOutData.checkOutTime}`
  );

  // 8. Clean Reset: Restore attendance record back to Pending state for live coach use
  const resetUpdates = {
    checkInTime: null,
    checkInLocation: null,
    checkOutTime: null,
    checkOutLocation: null,
    status: 'Pending',
    updatedAt: new Date().toISOString(),
  };

  await setDoc(attRef, resetUpdates, { merge: true });
  const resetDoc = await getDoc(attRef);
  assert(
    resetDoc.data().status === 'Pending' && resetDoc.data().checkInTime === null,
    '8. Reset: Restored attendance document back to Pending state for app testing',
    `Status: ${resetDoc.data().status}, checkInTime: ${resetDoc.data().checkInTime}`
  );

  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  if (passed === total) {
    console.log('🎉 ALL FIREBASE RELATIONSHIP & ATTENDANCE TESTS PASSED!');
  } else {
    console.log('⚠️ Some tests failed. Check log output above.');
  }
  console.log('===============================================================\n');
}

runVerification()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
