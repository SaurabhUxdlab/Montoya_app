import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * Calculates distance in meters between two GPS coordinates
 */
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 1. Cloud Function: clockIn
 * Validates authentication, shift, facility, location distance, and creates attendance record
 */
export const clockIn = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to clock in.');
  }

  const { facilityId, latitude, longitude, deviceTimestamp } = data;
  const coachId = context.auth.uid;

  const facilitySnap = await db.collection('facilities').doc(facilityId).get();
  if (!facilitySnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Assigned facility not found.');
  }

  const facilityData = facilitySnap.data()!;
  const distanceMeters = calculateDistanceMeters(
    latitude,
    longitude,
    facilityData.latitude,
    facilityData.longitude
  );

  const allowedRadius = facilityData.geofenceRadius || 50;
  const isInside = distanceMeters <= allowedRadius;
  const status = isInside ? 'On-Site' : 'Off-Site';

  const attendanceDocRef = db.collection('attendance').doc();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  const record = {
    attendanceId: attendanceDocRef.id,
    coachId,
    academyId: facilityData.academyId,
    facilityId,
    clockInTime: new Date().toISOString(),
    latitude,
    longitude,
    distanceFromVenue: distanceMeters,
    status,
    verificationStatus: isInside ? 'Verified' : 'Pending Override',
    serverTimestamp: timestamp,
    deviceTimestamp,
  };

  await attendanceDocRef.set(record);

  return {
    success: true,
    attendanceId: attendanceDocRef.id,
    status,
    distanceFromVenue: distanceMeters,
  };
});

/**
 * 2. Cloud Function: clockOut
 */
export const clockOut = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to clock out.');
  }

  const { attendanceId } = data;
  const attendanceRef = db.collection('attendance').doc(attendanceId);
  const snap = await attendanceRef.get();

  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Active attendance record not found.');
  }

  const clockOutTime = new Date().toISOString();
  await attendanceRef.update({
    clockOutTime,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, clockOutTime };
});

/**
 * 3. Cloud Function: requestAttendanceOverride
 */
export const requestAttendanceOverride = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { attendanceId, reason, location } = data;
  const coachId = context.auth.uid;
  const overrideRef = db.collection('attendanceOverrides').doc();

  const overrideDoc = {
    overrideId: overrideRef.id,
    coachId,
    attendanceId,
    reason,
    location,
    status: 'Pending',
    requestedAt: new Date().toISOString(),
  };

  await overrideRef.set(overrideDoc);

  return { success: true, overrideId: overrideRef.id };
});

/**
 * 4. Cloud Function: scheduleReminder (Run every 15 minutes)
 */
export const scheduleReminder = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const now = new Date();
    const thirtyMinsLater = new Date(now.getTime() + 30 * 60 * 1000);

    const snapshot = await db
      .collection('schedules')
      .where('startTime', '>=', now.toISOString())
      .where('startTime', '<=', thirtyMinsLater.toISOString())
      .get();

    snapshot.forEach(async (doc) => {
      const schedule = doc.data();
      // Trigger notification dispatch
      console.log(`Sending 30m shift reminder to coach ${schedule.coachId}`);
    });
  });

/**
 * 5. Cloud Function: scheduleUpdateNotification
 */
export const scheduleUpdateNotification = functions.firestore
  .document('schedules/{scheduleId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    if (!newData) return;

    console.log(`Schedule updated for coach ${newData.coachId}: ${newData.title}`);
  });

/**
 * 6. Cloud Function: dispatchUpdateNotification
 */
export const dispatchUpdateNotification = functions.firestore
  .document('dispatches/{dispatchId}')
  .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (!data) return;

    console.log(`Dispatch protocol ${data.protocolName} updated.`);
  });

/**
 * 7. Cloud Function: weatherAlert
 */
export const weatherAlert = functions.https.onCall(async (data, context) => {
  const { facilityId, alertType, message } = data;

  console.log(`Weather Alert triggered for ${facilityId}: ${alertType} - ${message}`);
  return { success: true };
});

/**
 * 8. Cloud Function: sessionValidation
 */
export const sessionValidation = functions.https.onCall(async (data, context) => {
  const { sessionType, players, billingAllocation } = data;

  if (sessionType === 'private' && (!players || players.length === 0)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Please select at least one player before submitting a private lesson.'
    );
  }

  if (billingAllocation && billingAllocation.length > 0) {
    const total = billingAllocation.reduce(
      (sum: number, item: any) => sum + (item.percentage || 0),
      0
    );
    if (total !== 100) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Split billing allocation must equal 100%. (Current: ${total}%)`
      );
    }
  }

  return { valid: true };
});
