const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
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

// Haversine distance calculation in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const VENUE_TEST = {
  facilityId: 'venue_test_fac_01',
  name: 'Trull Brook Club',
  latitude: 33.7928,
  longitude: -84.3879,
  geofenceRadius: 150,
};

const TEST_COACH = {
  uid: 'coach_uid_test_' + Date.now(),
  coachId: 'coach_id_test_' + Date.now(),
  name: 'Coach Francisco',
  email: 'francisco@montoyatennis.com',
};

async function runCheckInTests() {
  console.log('========================================================');
  console.log('🚀 RUNNING COACH CHECK-IN / CHECK-OUT VERIFICATION SUITE');
  console.log('========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, extraInfo = '') {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (extraInfo) console.log(`   ↳ ${extraInfo}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (extraInfo) console.error(`   ↳ ${extraInfo}`);
    }
  }

  // TEST 1: GPS Distance Math - On-Site Coordinates (~50m away)
  const onSiteLat = 33.7932;
  const onSiteLng = -84.3877;
  const distOnSite = calculateDistanceMeters(
    onSiteLat,
    onSiteLng,
    VENUE_TEST.latitude,
    VENUE_TEST.longitude
  );
  assert(
    distOnSite < 150,
    'GPS Verification: On-Site coordinate is within 150m radius',
    `Calculated Distance: ${Math.round(distOnSite)}m (Allowed: <= 150m)`
  );

  // TEST 2: GPS Distance Math - Off-Site Coordinates (> 150m away)
  const offSiteLat = 33.7985;
  const offSiteLng = -84.3850;
  const distOffSite = calculateDistanceMeters(
    offSiteLat,
    offSiteLng,
    VENUE_TEST.latitude,
    VENUE_TEST.longitude
  );
  assert(
    distOffSite > 150,
    'GPS Verification: Off-Site coordinate correctly rejected (> 150m)',
    `Calculated Distance: ${Math.round(distOffSite)}m (Allowed: <= 150m)`
  );

  // TEST 3: Pre-existing Shift Document Setup (matches Firestore schema from screenshot)
  const testShiftId = `shift_test_${Date.now()}`;
  const initialCreatedAt = '2026-09-16T08:00:00.000Z';
  const initialDate = '2026-09-16';
  const initialStartTime = '14:00';
  const initialEndTime = '22:00';
  const initialVenueId = VENUE_TEST.facilityId;

  const preExistingAttendanceDoc = {
    coachId: TEST_COACH.coachId,
    createdAt: initialCreatedAt,
    date: initialDate,
    endTime: initialEndTime,
    shiftId: testShiftId,
    startTime: initialStartTime,
    status: 'Incomplete',
    updatedAt: initialCreatedAt,
    venueId: initialVenueId,
  };

  const docRef = doc(db, 'attendance', testShiftId);

  try {
    // Write initial shift record as would exist in system
    await setDoc(docRef, preExistingAttendanceDoc);
    assert(
      true,
      'Pre-existing Attendance Document: Created initial shift record in Firestore',
      `Doc ID: ${testShiftId}, CoachId: ${TEST_COACH.coachId}`
    );
  } catch (err) {
    assert(false, 'Pre-existing Attendance Document Setup Failed', err.message);
  }

  // TEST 4: Find Attendance Record Using Coach ID & Session Relationship
  let foundDocId = '';
  try {
    const q = query(
      collection(db, 'attendance'),
      where('coachId', '==', TEST_COACH.coachId)
    );
    const snap = await getDocs(q);
    const matched = snap.docs.find((d) => {
      const data = d.data();
      return (
        d.id === testShiftId ||
        data.shiftId === testShiftId ||
        (data.date === initialDate && data.venueId === initialVenueId)
      );
    });

    if (matched) {
      foundDocId = matched.id;
    }

    assert(
      foundDocId === testShiftId,
      'Find Attendance by Coach ID: Located correct attendance document belonging to coach',
      `Found Document ID: ${foundDocId}`
    );
  } catch (err) {
    assert(false, 'Find Attendance by Coach ID: Query failed', err.message);
  }

  // TEST 5: Check-In Partial Update (Update ONLY checkInTime, checkInLocation, status, updatedAt)
  const checkInIso = new Date().toISOString();
  const checkInTimeStr = '14:05';
  const checkInLocation = {
    accuracy: 8.5,
    altitude: 120,
    capturedAt: checkInIso,
    latitude: onSiteLat,
    longitude: onSiteLng,
  };

  try {
    // Perform partial update with updateDoc
    await updateDoc(doc(db, 'attendance', foundDocId), {
      checkInTime: checkInTimeStr,
      checkInLocation: checkInLocation,
      status: 'Checked In',
      updatedAt: checkInIso,
    });

    // Fetch updated document and verify
    const snap = await getDoc(docRef);
    const data = snap.data();

    const partialUpdateValid =
      data.status === 'Checked In' &&
      data.checkInTime === checkInTimeStr &&
      data.checkInLocation?.latitude === onSiteLat &&
      data.checkInLocation?.longitude === onSiteLng &&
      data.updatedAt === checkInIso;

    const unModifiedFieldsIntact =
      data.coachId === TEST_COACH.coachId &&
      data.createdAt === initialCreatedAt &&
      data.date === initialDate &&
      data.endTime === initialEndTime &&
      data.shiftId === testShiftId &&
      data.startTime === initialStartTime &&
      data.venueId === initialVenueId;

    assert(
      partialUpdateValid && unModifiedFieldsIntact,
      'Check-In Update: Updated ONLY checkInTime, checkInLocation, status, updatedAt without touching existing fields',
      `Status: "${data.status}", checkInTime: "${data.checkInTime}", coachId preserved: "${data.coachId}"`
    );
  } catch (err) {
    assert(false, 'Check-In Update Failed', err.message);
  }

  // TEST 6: Duplicate Active Check-In Detection
  try {
    const q = query(
      collection(db, 'attendance'),
      where('coachId', '==', TEST_COACH.coachId)
    );
    const snap = await getDocs(q);
    const activeRecords = snap.docs.filter((d) => {
      const data = d.data();
      return !!data.checkInTime && !data.checkOutTime && data.status !== 'Completed';
    });

    assert(
      activeRecords.length === 1,
      'Duplicate Prevention: Active check-in is detected to prevent multiple simultaneous check-ins',
      `Active check-ins found: ${activeRecords.length}`
    );
  } catch (err) {
    assert(false, 'Duplicate Prevention Query Failed', err.message);
  }

  // TEST 7: Check-Out Partial Update (Update ONLY checkOutTime, checkOutLocation, status, updatedAt)
  const checkOutIso = new Date().toISOString();
  const checkOutTimeStr = '22:02';
  const checkOutLocation = {
    accuracy: 9.0,
    altitude: 120,
    capturedAt: checkOutIso,
    latitude: onSiteLat,
    longitude: onSiteLng,
  };

  try {
    // Perform partial update with updateDoc
    await updateDoc(doc(db, 'attendance', foundDocId), {
      checkOutTime: checkOutTimeStr,
      checkOutLocation: checkOutLocation,
      status: 'Completed',
      updatedAt: checkOutIso,
    });

    // Fetch updated document and verify
    const snap = await getDoc(docRef);
    const data = snap.data();

    const partialCheckOutValid =
      data.status === 'Completed' &&
      data.checkOutTime === checkOutTimeStr &&
      data.checkOutLocation?.latitude === onSiteLat &&
      data.checkOutLocation?.longitude === onSiteLng &&
      data.updatedAt === checkOutIso;

    const allPreservedFieldsIntact =
      data.coachId === TEST_COACH.coachId &&
      data.createdAt === initialCreatedAt &&
      data.date === initialDate &&
      data.endTime === initialEndTime &&
      data.shiftId === testShiftId &&
      data.startTime === initialStartTime &&
      data.venueId === initialVenueId &&
      data.checkInTime === checkInTimeStr; // Check-in data was not wiped out

    assert(
      partialCheckOutValid && allPreservedFieldsIntact,
      'Check-Out Update: Updated ONLY checkOutTime, checkOutLocation, status, updatedAt preserving all original fields',
      `Status: "${data.status}", checkOutTime: "${data.checkOutTime}", checkInTime preserved: "${data.checkInTime}"`
    );
  } catch (err) {
    assert(false, 'Check-Out Update Failed', err.message);
  }

  // Cleanup test document
  try {
    await deleteDoc(docRef);
    console.log('\n🧹 Cleaned up temporary test document from Firestore.');
  } catch (cleanupErr) {
    console.warn('Could not clean up test document:', cleanupErr);
  }

  console.log('\n========================================================');
  console.log(`📊 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL CHECK-IN / CHECK-OUT VERIFICATION TESTS PASSED!');
  } else {
    console.log('⚠️ Some tests failed. Check logs above.');
  }
  console.log('========================================================\n');
}

runCheckInTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });

