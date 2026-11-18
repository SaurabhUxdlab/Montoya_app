const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');

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

function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  if (trimmed.includes('T')) {
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    } catch (_e) {}
  }
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parts[1].padStart(2, '0');
    if (isNaN(hour)) return trimmed;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  }
  return trimmed;
}

function formatTimeRange(start, end) {
  const s = formatTime12h(start);
  const e = formatTime12h(end);
  if (s && e) return `${s} - ${e}`;
  if (s) return s;
  if (e) return e;
  return 'Flexible Time';
}

function deriveLessonType(typeStr, categoryStr, titleStr) {
  const combined = `${typeStr || ''} ${categoryStr || ''} ${titleStr || ''}`.toLowerCase();
  if (combined.includes('group') || combined.includes('clinic')) return 'group';
  if (combined.includes('duty') || combined.includes('shift')) return 'duty';
  return 'private';
}

async function getCoachSchedule(coachIdOrUid) {
  if (!coachIdOrUid) return { items: [], assignedLessons: [], nextSession: null };

  const schedulesRef = collection(db, 'schedules');
  const qSchedules = query(schedulesRef, where('coachId', '==', coachIdOrUid));
  const snapSchedules = await getDocs(qSchedules);

  const directSessionsMap = new Map();
  const latestSchedules = [];

  for (const docSnap of snapSchedules.docs) {
    const sch = { id: docSnap.id, ...docSnap.data() };
    latestSchedules.push(sch);

    if (sch.sessionIds && Array.isArray(sch.sessionIds)) {
      for (const sid of sch.sessionIds) {
        if (sid && !directSessionsMap.has(sid)) {
          try {
            const sDoc = await getDoc(doc(db, 'sessions', sid));
            if (sDoc.exists()) {
              directSessionsMap.set(sid, { id: sDoc.id, ...sDoc.data() });
            }
          } catch (e) {
            console.warn('getDoc session error:', e.message);
          }
        }
      }
    }
  }

  const assignedLessonsMap = new Map();
  const scheduleItems = [];

  for (const [sessId, s] of directSessionsMap.entries()) {
    const formattedTime = formatTimeRange(s.startTime, s.endTime);
    const venueDisplay = s.venueName || s.venue || 'Montoya Tennis Complex';
    const courtDisplay = s.courtName ? ` • ${s.courtName}` : '';
    const location = `${venueDisplay}${courtDisplay}`;
    const lType = deriveLessonType(s.sessionType || s.bookingType, s.category, s.playerName);
    const athleteName = s.playerName || s.athleteName || 'Athlete';
    const category = s.category || (lType === 'group' ? 'Group Clinic - Assigned' : lType === 'duty' ? 'Coaching Shift' : 'Private Lesson');

    assignedLessonsMap.set(sessId, {
      id: sessId,
      athleteName,
      category,
      date: s.date || 'Today',
      time: formattedTime,
      location,
      status: s.status || 'Confirmed',
      type: lType,
      phone: s.playerContact || '',
      notes: s.notes || '',
      courtId: s.courtId,
      courtName: s.courtName,
      venueId: s.venueId,
      venueName: venueDisplay,
      assignedCoachId: s.assignedCoachId || coachIdOrUid,
      assignedCoachName: s.assignedCoachName,
    });

    scheduleItems.push({
      scheduleId: sessId,
      coachId: s.assignedCoachId || coachIdOrUid,
      coachName: s.assignedCoachName,
      venueName: venueDisplay,
      title: `${category} - ${athleteName}`,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    });
  }

  for (const sch of latestSchedules) {
    const schId = sch.id;
    const formattedTime = formatTimeRange(sch.startTime, sch.endTime);
    const venueDisplay = sch.venueName || sch.venue || 'Montoya Tennis Complex';
    const shiftTitle = sch.sessionTitle || 'Coaching Shift';
    const lType = deriveLessonType(sch.sessionType || sch.bookingType, undefined, shiftTitle);

    const hasChildSessions = sch.sessionIds && sch.sessionIds.length > 0;
    const childSessionsExist = hasChildSessions && sch.sessionIds.some((id) => assignedLessonsMap.has(id));

    if (!childSessionsExist) {
      assignedLessonsMap.set(schId, {
        id: schId,
        athleteName: sch.coachName || 'Duty Shift',
        category: `${shiftTitle} (${sch.bookingType || 'Duty'})`,
        date: sch.date || 'Today',
        time: formattedTime,
        location: venueDisplay,
        status: sch.status || 'Scheduled',
        type: lType,
        venueId: sch.venueId,
        venueName: venueDisplay,
        assignedCoachId: sch.coachId,
        assignedCoachName: sch.coachName,
      });
    }

    if (!scheduleItems.some((it) => it.scheduleId === schId)) {
      scheduleItems.push({
        scheduleId: schId,
        coachId: sch.coachId,
        coachName: sch.coachName,
        venueName: venueDisplay,
        title: shiftTitle,
        date: sch.date,
        startTime: sch.startTime,
        endTime: sch.endTime,
      });
    }
  }

  const assignedLessons = Array.from(assignedLessonsMap.values());
  const nextSession = scheduleItems.length > 0 ? scheduleItems[0] : null;

  return { items: scheduleItems, assignedLessons, nextSession };
}

async function runTests() {
  console.log('====================================================');
  console.log('🎾 DYNAMIC SCHEDULE VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  const testEmail = `test.verifier.${Date.now()}@montoyatennis.com`;
  const testPassword = 'TestPassword123!';
  try {
    await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log(`Authenticated as ${testEmail}`);
  } catch (err) {
    console.warn('Auth note:', err.message);
  }

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // TEST 1: User 1 - Sofia Bennett (iuijYTHiarNsvmMt25Ms6LAbFGu2)
  console.log('\n--- TEST 1: Coach Sofia Bennett (iuijYTHiarNsvmMt25Ms6LAbFGu2) ---');
  const sofiaRes = await getCoachSchedule('iuijYTHiarNsvmMt25Ms6LAbFGu2');
  console.log(`Found ${sofiaRes.assignedLessons.length} assigned lessons:`);
  sofiaRes.assignedLessons.forEach((l) => {
    console.log(` - [${l.time}] ${l.category} with ${l.athleteName} at ${l.location} (Status: ${l.status})`);
  });
  assert(sofiaRes.assignedLessons.length >= 3, 'Coach Sofia has multiple assigned lessons in real-time');
  assert(sofiaRes.assignedLessons.every((l) => l.assignedCoachId === 'iuijYTHiarNsvmMt25Ms6LAbFGu2' || l.athleteName === 'Sofia Bennett'), 'All assigned lessons belong strictly to Sofia Bennett');

  // TEST 2: User 2 - TRAINER (cYZ2bbMKvMVNUvo4zpwKLZaydLY2)
  console.log('\n--- TEST 2: Coach TRAINER (cYZ2bbMKvMVNUvo4zpwKLZaydLY2) ---');
  const trainerRes = await getCoachSchedule('cYZ2bbMKvMVNUvo4zpwKLZaydLY2');
  console.log(`Found ${trainerRes.assignedLessons.length} assigned lessons:`);
  trainerRes.assignedLessons.forEach((l) => {
    console.log(` - [${l.time}] ${l.category} with ${l.athleteName} at ${l.location} (Status: ${l.status})`);
  });
  assert(trainerRes.assignedLessons.length >= 1, 'Coach TRAINER has assigned schedule');
  assert(trainerRes.assignedLessons.every((l) => l.assignedCoachId === 'cYZ2bbMKvMVNUvo4zpwKLZaydLY2' || l.athleteName === 'TRAINER'), 'All assigned lessons belong strictly to TRAINER');
  assert(!trainerRes.assignedLessons.some((l) => l.athleteName === 'Sofia Bennett' || l.athleteName === 'player 1'), 'TRAINER does NOT see Sofia Bennett\'s schedules');

  // TEST 3: User 3 - Marcus Webb (p2gsAHTF1OVs3xMNApHSiKGOJUn2)
  console.log('\n--- TEST 3: Coach Marcus Webb (p2gsAHTF1OVs3xMNApHSiKGOJUn2) ---');
  const marcusRes = await getCoachSchedule('p2gsAHTF1OVs3xMNApHSiKGOJUn2');
  console.log(`Found ${marcusRes.assignedLessons.length} assigned lessons:`);
  marcusRes.assignedLessons.forEach((l) => {
    console.log(` - [${l.time}] ${l.category} with ${l.athleteName} at ${l.location} (Status: ${l.status})`);
  });
  assert(marcusRes.assignedLessons.length >= 2, 'Coach Marcus Webb has 2 assigned lessons');
  assert(marcusRes.assignedLessons.every((l) => l.assignedCoachId === 'p2gsAHTF1OVs3xMNApHSiKGOJUn2'), 'All assigned lessons belong strictly to Marcus Webb');

  // TEST 4: Empty state user (unassigned user)
  console.log('\n--- TEST 4: Empty Schedule User (unassigned_user_12345) ---');
  const emptyRes = await getCoachSchedule('unassigned_user_12345');
  console.log(`Found ${emptyRes.assignedLessons.length} assigned lessons`);
  assert(emptyRes.assignedLessons.length === 0, 'Unassigned user returns empty list [] (No mock/demo fallback)');
  assert(emptyRes.nextSession === null, 'Unassigned user has nextSession === null');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
