import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  AttendanceRecord,
  CoachProfile,
  Facility,
  AssignedLesson,
} from '../types';
import { calculateDistanceMeters, evaluateGeofenceStatus } from '../utils/geofence';

// Configurable constants
export const DEFAULT_ALLOWED_RADIUS_METERS = 150;
export const MAX_ACCEPTABLE_GPS_ACCURACY_METERS = 50;

export interface AssignedSessionData {
  sessionId: string;
  scheduleId?: string;
  shiftId?: string;
  bookingId?: string;
  title: string;
  athleteName?: string;
  venueId?: string;
  venueName?: string;
  courtId?: string;
  courtName?: string;
  startTimeText?: string;
  endTimeText?: string;
  startTimeRaw?: string;
  endTimeRaw?: string;
  dateStr?: string;
  rawDate?: string;
  assignedCoachId?: string;
}

export const UNASSIGNED_VENUE: Facility = {
  facilityId: '',
  academyId: '',
  name: 'Venue not assigned',
  type: 'Outdoor Complex',
  season: 'Summer',
  address: '',
  latitude: 0,
  longitude: 0,
  geofenceRadius: 150,
  status: 'active',
};

/**
 * Fetch venue coordinates and geofence radius dynamically from Firestore `venues` collection.
 */
export const getAssignedVenue = async (venueIdOrName?: string): Promise<Facility> => {
  if (!venueIdOrName || venueIdOrName === 'Venue not assigned') {
    return UNASSIGNED_VENUE;
  }

  try {
    // 1. Try direct document ID lookup in venues/{venueId}
    const venueRef = doc(db, 'venues', venueIdOrName);
    const snap = await getDoc(venueRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        facilityId: snap.id,
        academyId: data.academyId || '',
        name: data.name || data.venueName || venueIdOrName,
        type: data.type || 'Tennis Complex',
        season: data.season || 'Summer',
        address: data.address || '',
        latitude: Number(data.latitude) || 0,
        longitude: Number(data.longitude) || 0,
        geofenceRadius: Number(data.geofenceRadius || data.allowedRadiusMeters) || DEFAULT_ALLOWED_RADIUS_METERS,
        status: data.status || 'active',
      };
    }

    // 2. Query venues collection by name if not found by direct ID
    const qName = query(collection(db, 'venues'), where('name', '==', venueIdOrName));
    const nameSnap = await getDocs(qName);
    if (!nameSnap.empty) {
      const firstDoc = nameSnap.docs[0];
      const data = firstDoc.data();
      return {
        facilityId: firstDoc.id,
        academyId: data.academyId || '',
        name: data.name || data.venueName || venueIdOrName,
        type: data.type || 'Tennis Complex',
        season: data.season || 'Summer',
        address: data.address || '',
        latitude: Number(data.latitude) || 0,
        longitude: Number(data.longitude) || 0,
        geofenceRadius: Number(data.geofenceRadius || data.allowedRadiusMeters) || DEFAULT_ALLOWED_RADIUS_METERS,
        status: data.status || 'active',
      };
    }
  } catch (err) {
    console.warn('[AttendanceService] Venue lookup error:', err);
  }

  return {
    ...UNASSIGNED_VENUE,
    name: venueIdOrName,
  };
};

// Module-level venue and court cache to resolve venueName and courtName for attendance records
const venuesCache = new Map<string, { name: string; courts: Map<string, string> }>();
let unsubVenuesGlobal: Unsubscribe | null = null;

const ensureVenuesCacheListener = (onCacheUpdate?: () => void) => {
  if (!unsubVenuesGlobal) {
    const venuesRef = collection(db, 'venues');
    unsubVenuesGlobal = onSnapshot(
      venuesRef,
      (snapshot) => {
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const venueId = d.id;
          const existing = venuesCache.get(venueId);
          const courts = existing?.courts || new Map<string, string>();

          venuesCache.set(venueId, {
            name: data.name || data.venueName || venueId,
            courts,
          });

          // Fetch courts subcollection
          const courtsRef = collection(db, 'venues', venueId, 'courts');
          onSnapshot(
            courtsRef,
            (cSnap) => {
              cSnap.docs.forEach((cd) => {
                courts.set(cd.id, cd.data().name || cd.id);
              });
              if (onCacheUpdate) onCacheUpdate();
            },
            () => {}
          );
        });
        if (onCacheUpdate) onCacheUpdate();
      },
      (err) => console.warn('[AttendanceService] Venues cache listener error:', err)
    );
  }
};

export const resolveVenueNameFromId = (venueId?: string, fallback?: string): string => {
  if (venueId && venuesCache.has(venueId)) {
    return venuesCache.get(venueId)!.name;
  }
  return fallback || 'Riverside Club';
};

export const resolveCourtNameFromId = (venueId?: string, courtId?: string, fallback?: string): string => {
  if (venueId && courtId && venuesCache.has(venueId)) {
    const v = venuesCache.get(venueId)!;
    if (v.courts.has(courtId)) {
      return v.courts.get(courtId)!;
    }
  }
  return fallback || '';
};

/**
 * Safely parse timestamp / date from attendance record for reliable numeric epoch sorting.
 */
export const getRecordTimestamp = (r: any): number => {
  if (!r) return 0;
  if (r.updatedAt) {
    const t = new Date(r.updatedAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (r.createdAt) {
    const t = new Date(r.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (r.checkInLocation?.capturedAt) {
    const t = new Date(r.checkInLocation.capturedAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (r.checkOutLocation?.capturedAt) {
    const t = new Date(r.checkOutLocation.capturedAt).getTime();
    if (!isNaN(t)) return t;
  }
  const timeStr = r.checkOutTime || r.checkInTime;
  if (timeStr) {
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      const t = new Date(timeStr).getTime();
      if (!isNaN(t)) return t;
    }
    const dStr = r.date || new Date().toISOString().split('T')[0];
    const combined = `${dStr}T${String(timeStr).padStart(5, '0')}:00`;
    const t = new Date(combined).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
};

/**
 * Subscribe to active checked-in attendance for a coach in real-time from Firestore.
 * Listens to `attendance` collection where `userId == coachIdOrUid` or `coachId == coachIdOrUid`.
 */
export interface ActiveAttendanceUpdate {
  active: AttendanceRecord | null;
  latestCompleted: AttendanceRecord | null;
}

export const subscribeToActiveAttendance = (
  coachIdOrUid: string,
  onUpdate: (data: ActiveAttendanceUpdate) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!coachIdOrUid) {
    onUpdate({ active: null, latestCompleted: null });
    return () => {};
  }

  const attRef = collection(db, 'attendance');

  let activeRecordsByUserId: any[] = [];
  let activeRecordsByCoachId: any[] = [];

  const evaluateAndEmit = () => {
    const combinedDocs = [...activeRecordsByUserId, ...activeRecordsByCoachId];
    const result = findActiveAndLatestCompletedFromDocs(combinedDocs);
    onUpdate(result);
  };

  ensureVenuesCacheListener(evaluateAndEmit);

  // 1. Query by userId
  const qUser = query(attRef, where('userId', '==', coachIdOrUid));
  const unsubUser = onSnapshot(
    qUser,
    (snapshot) => {
      activeRecordsByUserId = snapshot.docs;
      evaluateAndEmit();
    },
    (err) => {
      console.warn('[AttendanceService] Active attendance listener (userId) error:', err);
      if (onError) onError(err);
    }
  );

  // 2. Query by coachId
  const qCoach = query(attRef, where('coachId', '==', coachIdOrUid));
  const unsubCoach = onSnapshot(
    qCoach,
    (snapshot) => {
      activeRecordsByCoachId = snapshot.docs;
      evaluateAndEmit();
    },
    (err) => {
      console.warn('[AttendanceService] Active attendance listener (coachId) error:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubUser();
    unsubCoach();
  };
};

function findActiveAndLatestCompletedFromDocs(docs: any[]): ActiveAttendanceUpdate {
  const seenIds = new Set<string>();
  const records: AttendanceRecord[] = [];

  for (const d of docs) {
    if (!seenIds.has(d.id)) {
      seenIds.add(d.id);
      const data = d.data() as any;
      const venueId = data.venueId;
      const courtId = data.courtId;
      const resolvedVenue = data.venueName || resolveVenueNameFromId(venueId, data.venueName);
      const resolvedCourt = data.courtName || resolveCourtNameFromId(venueId, courtId, data.courtName);

      records.push({
        attendanceId: d.id,
        ...data,
        venueName: resolvedVenue,
        courtName: resolvedCourt,
      });
    }
  }

  // Sort descending by timestamp
  records.sort((a, b) => {
    const timeA = getRecordTimestamp(a);
    const timeB = getRecordTimestamp(b);
    return timeB - timeA;
  });

  const nowIso = new Date().toISOString();
  const todayDateStr = nowIso.split('T')[0];

  // Active record is one where status indicates active check-in and checkOutTime is not set
  const active = records.find((r) => {
    const s = (r.status || '').toLowerCase();
    const isCheckedInStatus =
      !!r.checkInTime &&
      (s.includes('check') ||
        s.includes('present') ||
        s.includes('progress') ||
        s.includes('site'));
    const isCheckedOut =
      !!r.checkOutTime ||
      !!r.clockOutTime ||
      s.includes('complet') ||
      s.includes('cancel');

    return isCheckedInStatus && !isCheckedOut;
  });

  // Latest completed record for today
  const latestCompleted = records.find((r) => {
    const s = (r.status || '').toLowerCase();
    const isCheckedOut =
      !!r.checkOutTime ||
      !!r.clockOutTime ||
      s.includes('complet');
    const recordDate =
      r.date ||
      (r.checkInLocation?.capturedAt ? r.checkInLocation.capturedAt.split('T')[0] : '') ||
      (r.createdAt ? r.createdAt.split('T')[0] : '') ||
      (r.checkInTime && typeof r.checkInTime === 'string' && r.checkInTime.includes('T') ? r.checkInTime.split('T')[0] : '');
    const isToday = !recordDate || recordDate === todayDateStr;

    return isCheckedOut && isToday;
  });

  return {
    active: active || null,
    latestCompleted: latestCompleted || null,
  };
}

/**
 * Subscribe to the complete attendance history for a coach.
 */
export const subscribeToAttendanceHistory = (
  coachIdOrUid: string,
  onUpdate: (history: AttendanceRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!coachIdOrUid) {
    onUpdate([]);
    return () => {};
  }

  const attRef = collection(db, 'attendance');

  let docsByUserId: any[] = [];
  let docsByCoachId: any[] = [];

  const emitHistory = () => {
    const combined = [...docsByUserId, ...docsByCoachId];
    const seenIds = new Set<string>();
    const records: AttendanceRecord[] = [];

    for (const d of combined) {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        const data = d.data() as any;
        const venueId = data.venueId;
        const courtId = data.courtId;
        const resolvedVenue = data.venueName || resolveVenueNameFromId(venueId, data.venueName);
        const resolvedCourt = data.courtName || resolveCourtNameFromId(venueId, courtId, data.courtName);

        records.push({
          attendanceId: d.id,
          ...data,
          venueName: resolvedVenue,
          courtName: resolvedCourt,
        });
      }
    }

    records.sort((a, b) => {
      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      return timeB - timeA;
    });

    onUpdate(records);
  };

  ensureVenuesCacheListener(emitHistory);

  const qUser = query(attRef, where('userId', '==', coachIdOrUid));
  const unsubUser = onSnapshot(
    qUser,
    (snapshot) => {
      docsByUserId = snapshot.docs;
      emitHistory();
    },
    (err) => {
      console.warn('[AttendanceService] Attendance history listener (userId) error:', err);
      if (onError) onError(err);
    }
  );

  const qCoach = query(attRef, where('coachId', '==', coachIdOrUid));
  const unsubCoach = onSnapshot(
    qCoach,
    (snapshot) => {
      docsByCoachId = snapshot.docs;
      emitHistory();
    },
    (err) => {
      console.warn('[AttendanceService] Attendance history listener (coachId) error:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubUser();
    unsubCoach();
  };
};

/**
 * Check-In Execution with Full Validations:
 * 1. Accuracy & Distance Checks (if venue coordinates are configured)
 * 2. Duplicate Check-In Prevention
 * 3. Find existing attendance record for the coach using coachId and session relationship
 * 4. Partial update of required check-in fields to Firestore `attendance` collection using updateDoc
 */
export interface CheckInPayload {
  coach: CoachProfile;
  session: AssignedSessionData | AssignedLesson;
  venue: Facility;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    capturedAt: string;
  };
  distanceMeters: number;
}

/**
 * Recursively strip all undefined fields from an object so Firestore updateDoc does not reject it.
 */
function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) =>
        item !== null && typeof item === 'object' && !(item instanceof Date)
          ? removeUndefinedFields(item)
          : item
      ) as unknown as T;
  }
  const cleanObj: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) {
      continue;
    }
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      cleanObj[key] = removeUndefinedFields(val);
    } else {
      cleanObj[key] = val;
    }
  }
  return cleanObj;
}

export const performCoachCheckIn = async (
  payload: CheckInPayload
): Promise<AttendanceRecord> => {
  const { coach, session, venue, location, distanceMeters } = payload;
  const now = new Date();
  const nowIso = now.toISOString();
  const todayDateStr = nowIso.split('T')[0];
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 1. Validate Session Assignment & Coach Authentication
  const coachUid = coach?.uid || '';
  const coachId = coach?.coachId || coach?.userId || coach?.uid || '';

  if (!coachId && !coachUid) {
    throw new Error('No authenticated coach found to perform check-in.');
  }

  const sessionCoachId =
    (session as any)?.assignedCoachId ||
    (session as any)?.coachId ||
    '';

  if (sessionCoachId && sessionCoachId !== coachUid && sessionCoachId !== coachId) {
    throw new Error('This session is assigned to another coach and cannot be checked into.');
  }

  // 2. Verify GPS Accuracy (if location is provided)
  if (location.accuracy > MAX_ACCEPTABLE_GPS_ACCURACY_METERS) {
    throw new Error(
      `Location accuracy is too low (${Math.round(location.accuracy)}m). Please wait a moment and tap Refresh GPS.`
    );
  }

  // 3. Verify Distance within Allowed Radius (only if venue has valid coordinates)
  const hasVenueCoords = venue.latitude !== 0 && venue.longitude !== 0;
  const maxAllowed = venue.geofenceRadius || DEFAULT_ALLOWED_RADIUS_METERS;

  if (hasVenueCoords && distanceMeters > maxAllowed) {
    throw new Error(
      `You are ${Math.round(distanceMeters)}m away from ${venue.name}. Check-in requires being within ${maxAllowed}m.`
    );
  }

  // 4. Prevent Duplicate Active Check-In for this Coach
  try {
    const existingQCoach = query(
      collection(db, 'attendance'),
      where('coachId', '==', coachId)
    );
    const existingSnapCoach = await getDocs(existingQCoach);
    const activeCoach = findActiveAndLatestCompletedFromDocs(existingSnapCoach.docs).active;
    if (activeCoach) {
      throw new Error(`You are already checked in at ${activeCoach.venueName || venue.name}. Please check out first.`);
    }

    if (coachUid && coachUid !== coachId) {
      const existingQUid = query(
        collection(db, 'attendance'),
        where('userId', '==', coachUid)
      );
      const existingSnapUid = await getDocs(existingQUid);
      const activeUid = findActiveAndLatestCompletedFromDocs(existingSnapUid.docs).active;
      if (activeUid) {
        throw new Error(`You are already checked in at ${activeUid.venueName || venue.name}. Please check out first.`);
      }
    }
  } catch (checkErr: any) {
    if (checkErr.message?.includes('already checked in')) {
      throw checkErr;
    }
    console.warn('[AttendanceService] Active check verification notice:', checkErr);
  }

  // 5. Look up existing Attendance record for the logged-in coach in Firestore
  const targetShiftId =
    (session as any)?.shiftId ||
    (session as any)?.scheduleId ||
    (session as any)?.sessionId ||
    (session as any)?.id ||
    '';
  const sessionDate =
    (session as any)?.rawDate ||
    (session as any)?.dateStr ||
    (session as any)?.date ||
    todayDateStr;
  const sessionVenueId = (session as any)?.venueId || venue?.facilityId || '';
  const sessionStartTime = (session as any)?.startTimeRaw || (session as any)?.startTime || (session as any)?.time || '';

  let targetDocId = '';
  let existingAttendanceData: any = null;

  // Step 5a: If targetShiftId is provided, check direct document by ID
  if (targetShiftId) {
    try {
      const directRef = doc(db, 'attendance', targetShiftId);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        const data = directSnap.data();
        const belongsToCoach =
          data.coachId === coachId ||
          data.coachId === coachUid ||
          data.userId === coachUid ||
          data.userId === coachId ||
          (!data.coachId && !data.userId);

        if (belongsToCoach) {
          targetDocId = targetShiftId;
          existingAttendanceData = data;
        }
      }
    } catch (e) {
      console.warn('[AttendanceService] Notice looking up direct attendance doc:', e);
    }
  }

  // Step 5b: Query attendance records for the logged-in coach
  if (!targetDocId) {
    try {
      const qCoach = query(collection(db, 'attendance'), where('coachId', '==', coachId));
      const coachSnap = await getDocs(qCoach);
      let coachDocs = coachSnap.docs;

      if (coachDocs.length === 0 && coachUid && coachUid !== coachId) {
        const qUid = query(collection(db, 'attendance'), where('userId', '==', coachUid));
        const uidSnap = await getDocs(qUid);
        coachDocs = uidSnap.docs;
      }

      if (coachDocs.length > 0) {
        // Match by shiftId / sessionId / bookingId / document ID
        if (targetShiftId) {
          const shiftMatch = coachDocs.find((d) => {
            const data = d.data();
            return (
              d.id === targetShiftId ||
              data.shiftId === targetShiftId ||
              data.sessionId === targetShiftId ||
              data.bookingId === targetShiftId
            );
          });
          if (shiftMatch) {
            targetDocId = shiftMatch.id;
            existingAttendanceData = shiftMatch.data();
          }
        }

        // Match by date + session relationship
        if (!targetDocId) {
          const dateMatches = coachDocs.filter((d) => {
            const data = d.data();
            const dDate = data.date || (data.createdAt ? data.createdAt.split('T')[0] : '');
            return dDate === sessionDate;
          });

          if (dateMatches.length === 1) {
            targetDocId = dateMatches[0].id;
            existingAttendanceData = dateMatches[0].data();
          } else if (dateMatches.length > 1) {
            const specificMatch =
              dateMatches.find((d) => {
                const data = d.data();
                const venueMatch = sessionVenueId && data.venueId === sessionVenueId;
                const timeMatch = sessionStartTime && (data.startTime === sessionStartTime || data.scheduledStartTime === sessionStartTime);
                const isNotCompleted = !data.checkOutTime && data.status !== 'Completed';
                return (venueMatch || timeMatch) && isNotCompleted;
              }) ||
              dateMatches.find((d) => {
                const data = d.data();
                return !data.checkOutTime && data.status !== 'Completed';
              }) ||
              dateMatches[0];

            targetDocId = specificMatch.id;
            existingAttendanceData = specificMatch.data();
          }
        }
      }
    } catch (queryErr) {
      console.warn('[AttendanceService] Notice querying attendance for coach:', queryErr);
    }
  }

  // Strictly do NOT create a new Attendance document if one does not exist
  if (!targetDocId || !existingAttendanceData) {
    throw new Error('No existing attendance record found for this coach and session in Firebase.');
  }

  // 6. Check-in location map with exact structure
  const checkInLocationData = {
    accuracy: Number(location.accuracy) || 0,
    altitude: Number(location.altitude) || 0,
    capturedAt: location.capturedAt || nowIso,
    latitude: Number(location.latitude) || 0,
    longitude: Number(location.longitude) || 0,
  };

  // 7. Partial Firebase Update: Update ONLY checkInTime, checkInLocation, status, and updatedAt
  const firestoreUpdates = {
    checkInTime: nowTimeStr,
    checkInLocation: checkInLocationData,
    status: 'Checked In',
    updatedAt: nowIso,
  };

  const docRef = doc(db, 'attendance', targetDocId);
  await updateDoc(docRef, removeUndefinedFields(firestoreUpdates));

  const updatedRecord: AttendanceRecord = {
    ...existingAttendanceData,
    attendanceId: targetDocId,
    checkInTime: nowTimeStr,
    checkInLocation: checkInLocationData,
    status: 'Checked In',
    updatedAt: nowIso,
  };

  return updatedRecord;
};

/**
 * Check-Out Execution:
 * Updates existing attendance record in Firestore strictly with `checkOutTime`, `checkOutLocation`, `status: "Completed"`, and `updatedAt`.
 * Uses updateDoc for partial update without overwriting any other fields.
 */
export interface CheckOutPayload {
  attendanceId?: string;
  coach?: CoachProfile;
  session?: AssignedSessionData | AssignedLesson;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    capturedAt: string;
  };
  distanceMeters?: number;
}

export const performCoachCheckOut = async (
  payload: CheckOutPayload
): Promise<void> => {
  const { attendanceId, coach, location } = payload;
  const now = new Date();
  const nowIso = now.toISOString();
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let targetDocId = attendanceId || '';

  // If attendanceId was not provided, look up the active record for this coach
  if (!targetDocId && coach) {
    const coachId = coach.coachId || coach.userId || coach.uid;
    const qCoach = query(collection(db, 'attendance'), where('coachId', '==', coachId));
    const snap = await getDocs(qCoach);
    const active = findActiveAndLatestCompletedFromDocs(snap.docs).active;
    if (active?.attendanceId) {
      targetDocId = active.attendanceId;
    }
  }

  if (!targetDocId) {
    throw new Error('No active attendance record found to check out.');
  }

  const checkOutLocationData = {
    accuracy: Number(location.accuracy) || 0,
    altitude: Number(location.altitude) || 0,
    capturedAt: location.capturedAt || nowIso,
    latitude: Number(location.latitude) || 0,
    longitude: Number(location.longitude) || 0,
  };

  // Partial Firebase Update: Update ONLY checkOutTime, checkOutLocation, status, and updatedAt
  const firestoreUpdates = {
    checkOutTime: nowTimeStr,
    checkOutLocation: checkOutLocationData,
    status: 'Completed',
    updatedAt: nowIso,
  };

  const docRef = doc(db, 'attendance', targetDocId);
  await updateDoc(docRef, removeUndefinedFields(firestoreUpdates));
};


