import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  CoachAvailabilityRecord,
  AvailabilityFormData,
  AvailabilityStatus,
  VenueOption,
} from '../types';

export const AVAILABILITY_COLLECTION = 'availability';

/**
 * Format 24-hour time string ("17:00") to 12-hour AM/PM string ("5:00 PM")
 */
export function formatTime12h(timeStr?: string): string {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;

  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    if (isNaN(h)) return trimmed;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }
  return trimmed;
}

/**
 * Format time string into standardized 24-hour "HH:mm" format
 */
export function format24HourTime(timeStr?: string): string {
  if (!timeStr || typeof timeStr !== 'string') return timeStr || '';
  const clean = timeStr.trim();
  if (!clean.includes(':')) return clean;

  const isPM = clean.toLowerCase().includes('pm');
  const isAM = clean.toLowerCase().includes('am');

  if (isPM || isAM) {
    const raw = clean.replace(/am|pm/gi, '').trim();
    const parts = raw.split(':');
    let h = parseInt(parts[0], 10) || 0;
    const m = (parts[1] || '00').padStart(2, '0');
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  const parts = clean.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = (parts[1] || '00').padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${m}`;
}

/**
 * Generate 30-minute interval options based on venue opening and closing hours
 */
export function generateVenueTimeOptions(openTimeStr = '06:00', closeTimeStr = '22:00') {
  const parseMins = (t: string) => {
    if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  let startMins = parseMins(openTimeStr);
  let endMins = parseMins(closeTimeStr);

  if (endMins <= startMins) {
    startMins = 6 * 60;
    endMins = 22 * 60;
  }

  const options: { value: string; label: string }[] = [];
  for (let m = startMins; m <= endMins; m += 30) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    const val = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    options.push({ value: val, label: formatTime12h(val) });
  }
  return options;
}

/**
 * Format timestamp or date object into a human-readable ISO string
 */
function parseTimestampToStr(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      return '';
    }
  }
  if (typeof val?.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  return '';
}

/**
 * Map raw Firestore document data to CoachAvailabilityRecord with dynamic venue name resolution
 */
export function mapFirestoreToAvailabilityRecord(
  docId: string,
  data: any,
  venuesMap?: Map<string, { id: string; name: string }>
): CoachAvailabilityRecord {
  const rawVenueId = String(data.venueId || data.locationId || '').trim();
  let venue = data.venue || data.locationName || data.location || '';
  let venueId = rawVenueId;

  // Dynamically resolve venue name using venueId reference if venue string is empty or missing
  if (venuesMap && venuesMap.size > 0) {
    if (rawVenueId && venuesMap.has(rawVenueId)) {
      const v = venuesMap.get(rawVenueId);
      if (v?.name) {
        venue = v.name;
        venueId = v.id;
      }
    } else if (rawVenueId) {
      // Check case-insensitive match on ID
      for (const [vId, vObj] of venuesMap.entries()) {
        if (vId.toLowerCase() === rawVenueId.toLowerCase()) {
          venue = vObj.name;
          venueId = vObj.id;
          break;
        }
      }
    }

    // If venue name was provided but venueId was not, resolve venueId
    if (!venueId && venue) {
      for (const [vId, vObj] of venuesMap.entries()) {
        if (vObj.name.toLowerCase() === venue.toLowerCase()) {
          venue = vObj.name;
          venueId = vId;
          break;
        }
      }
    }
  }

  // If still empty but venueId exists, show venueId
  if (!venue && rawVenueId) {
    venue = `Venue (${rawVenueId})`;
  }

  let availableFor: string[] = [];
  if (Array.isArray(data.availableFor)) {
    availableFor = data.availableFor;
  } else {
    if (data.privateLessonEligibility ?? data.privateLessonWillingness ?? true) {
      availableFor.push('Private Lessons');
    }
    if (data.groupSessionEligibility ?? data.groupSessionWillingness ?? true) {
      availableFor.push('Group Sessions');
    }
  }

  const privateLessonEligibility = Array.isArray(data.availableFor)
    ? data.availableFor.includes('Private Lessons')
    : (data.privateLessonEligibility ?? data.privateLessonWillingness ?? true);

  const groupSessionEligibility = Array.isArray(data.availableFor)
    ? data.availableFor.includes('Group Sessions') || data.availableFor.includes('Group Clinics')
    : (data.groupSessionEligibility ?? data.groupSessionWillingness ?? true);

  const rawStatus = data.status || data.availabilityStatus || 'Submitted';
  const status: AvailabilityStatus =
    rawStatus === 'Approved'
      ? 'Approved'
      : rawStatus === 'Rejected'
      ? 'Rejected'
      : rawStatus === 'Unavailable'
      ? 'Unavailable'
      : rawStatus === 'Available'
      ? 'Available'
      : 'Submitted';

  return {
    id: docId,
    coachId: data.coachId || data.userId || '',
    coachName: data.coachName || 'Coach',
    coachEmail: data.coachEmail || '',
    coachRole: data.coachRole || 'Coach',
    coachPhoto: data.coachPhoto || data.profilePhoto || '',
    venue: venue || 'Venue not specified',
    venueId,
    locationName: venue || 'Venue not specified',
    locationId: venueId,
    date: typeof data.date === 'string' && data.date ? data.date.trim().split('T')[0] : '',
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    availableFor,
    privateLessonEligibility,
    groupSessionEligibility,
    privateLessonWillingness: privateLessonEligibility,
    groupSessionWillingness: groupSessionEligibility,
    status,
    availabilityStatus: status === 'Approved' || status === 'Available' ? 'Available' : 'Unavailable',
    notes: data.notes || '',
    rejectionReason: data.rejectionReason || '',
    isRecurring: Boolean(data.isRecurring),
    recurringFrequency: data.recurringFrequency || null,
    recurringDays: Array.isArray(data.recurringDays) ? data.recurringDays : null,
    recurringEndDate: data.recurringEndDate || null,
    submittedBy: data.submittedBy || 'Coach App',
    createdAt: parseTimestampToStr(data.createdAt) || new Date().toISOString(),
    updatedAt: parseTimestampToStr(data.updatedAt) || new Date().toISOString(),
  };
}

/**
 * Subscribe to real-time availability records for a coach with real-time venue reference resolution
 */
export function subscribeToCoachAvailability(
  coachIdOrUid: string,
  onUpdate: (records: CoachAvailabilityRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!coachIdOrUid) {
    onUpdate([]);
    return () => {};
  }

  const availabilityRef = collection(db, AVAILABILITY_COLLECTION);
  const venuesRef = collection(db, 'venues');

  let rawDocs: { id: string; data: any }[] = [];
  const venuesMap = new Map<string, { id: string; name: string }>();

  const processAndEmit = () => {
    const records: CoachAvailabilityRecord[] = [];

    for (const item of rawDocs) {
      const data = item.data;
      const docCoachId = String(data.coachId || data.userId || '');

      if (
        docCoachId === coachIdOrUid ||
        docCoachId.toLowerCase() === coachIdOrUid.toLowerCase()
      ) {
        records.push(mapFirestoreToAvailabilityRecord(item.id, data, venuesMap));
      }
    }

    // Sort newest date and startTime first
    records.sort((a, b) => {
      if (b.date !== a.date) return (b.date || '').localeCompare(a.date || '');
      return (b.startTime || '').localeCompare(a.startTime || '');
    });

    onUpdate(records);
  };

  // 1. Subscribe to venues to dynamically resolve venue names
  const unsubVenues = onSnapshot(
    venuesRef,
    (venuesSnap) => {
      venuesMap.clear();
      venuesSnap.forEach((d) => {
        const vData = d.data();
        const vName = String(
          vData.name || vData.venueName || vData.title || vData.facilityName || ''
        ).trim();
        if (vName) {
          venuesMap.set(d.id, { id: d.id, name: vName });
        }
      });
      processAndEmit();
    },
    (err) => {
      console.warn('[subscribeToCoachAvailability] Venues listener error:', err);
    }
  );

  // 2. Subscribe to availability collection
  const unsubAvailability = onSnapshot(
    availabilityRef,
    (snapshot) => {
      rawDocs = [];
      snapshot.forEach((docSnap) => {
        rawDocs.push({ id: docSnap.id, data: docSnap.data() });
      });
      processAndEmit();
    },
    (err) => {
      console.warn('[subscribeToCoachAvailability] Availability listener error:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubVenues();
    unsubAvailability();
  };
}

/**
 * Fetch availability records once for a coach with venue name resolution
 */
export async function fetchCoachAvailability(coachIdOrUid: string): Promise<CoachAvailabilityRecord[]> {
  if (!coachIdOrUid) return [];
  try {
    const [availSnap, venuesSnap] = await Promise.all([
      getDocs(collection(db, AVAILABILITY_COLLECTION)),
      getDocs(collection(db, 'venues')).catch(() => null),
    ]);

    const venuesMap = new Map<string, { id: string; name: string }>();
    if (venuesSnap) {
      venuesSnap.forEach((d) => {
        const vData = d.data();
        const vName = String(
          vData.name || vData.venueName || vData.title || vData.facilityName || ''
        ).trim();
        if (vName) {
          venuesMap.set(d.id, { id: d.id, name: vName });
        }
      });
    }

    const records: CoachAvailabilityRecord[] = [];

    availSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const docCoachId = String(data.coachId || data.userId || '');
      if (
        docCoachId === coachIdOrUid ||
        docCoachId.toLowerCase() === coachIdOrUid.toLowerCase()
      ) {
        records.push(mapFirestoreToAvailabilityRecord(docSnap.id, data, venuesMap));
      }
    });

    records.sort((a, b) => {
      if (b.date !== a.date) return (b.date || '').localeCompare(a.date || '');
      return (b.startTime || '').localeCompare(a.startTime || '');
    });

    return records;
  } catch (error) {
    console.error('Error fetching coach availability:', error);
    return [];
  }
}

/**
 * Synchronize approved availability with schedules and attendance (Matching Dashboard flow)
 */
async function syncApprovedAvailabilityToAttendance(availRecord: {
  id: string;
  coachId: string;
  coachName?: string;
  coachPhoto?: string;
  venue?: string;
  venueId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}): Promise<void> {
  if (!availRecord || !availRecord.id) return;

  const shiftId = availRecord.id;
  const formattedStartTime = format24HourTime(availRecord.startTime);
  const formattedEndTime = format24HourTime(availRecord.endTime);

  if (availRecord.status === 'Approved') {
    const now = new Date().toISOString();
    const schedulePayload = {
      id: shiftId,
      coachId: availRecord.coachId || '',
      venueId: availRecord.venueId || '',
      date: availRecord.date,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      sessionIds: [],
      status: 'Scheduled',
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'schedules', shiftId), {
        ...schedulePayload,
        createdAt: now,
      }, { merge: true });
    } catch (e) {
      console.warn('Could not sync availability shift to schedules:', e);
    }

    try {
      await setDoc(doc(db, 'attendance', shiftId), {
        shiftId,
        coachId: availRecord.coachId || '',
        venueId: availRecord.venueId || '',
        date: availRecord.date,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        status: 'Pending',
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    } catch (e) {
      console.warn('Could not sync availability shift to attendance:', e);
    }
  } else if (availRecord.status === 'Rejected') {
    try {
      await deleteDoc(doc(db, 'schedules', shiftId)).catch(() => null);
      await deleteDoc(doc(db, 'attendance', shiftId)).catch(() => null);
    } catch (e) {
      console.warn('Could not clean up schedule/attendance for rejected availability:', e);
    }
  }
}

/**
 * Create a new Coach Availability record in Firestore
 */
export async function createCoachAvailability(
  data: AvailabilityFormData,
  submittedByUserEmail?: string | null
): Promise<string> {
  const formattedStartTime = format24HourTime(data.startTime);
  const formattedEndTime = format24HourTime(data.endTime);

  const availableFor: string[] = Array.isArray(data.availableFor) && data.availableFor.length > 0
    ? data.availableFor
    : [
        ...(data.privateLessonEligibility ? ['Private Lessons'] : []),
        ...(data.groupSessionEligibility ? ['Group Sessions'] : []),
      ];

  const status: AvailabilityStatus = data.status || 'Submitted';
  const now = new Date().toISOString();

  const payload: Record<string, any> = {
    coachId: data.coachId || '',
    userId: data.coachId || '',
    coachName: (data.coachName || 'Coach').trim(),
    coachEmail: data.coachEmail || '',
    coachRole: data.coachRole || 'Coach',
    coachPhoto: data.coachPhoto || '',
    venue: (data.venue || data.locationName || '').trim(),
    venueId: data.venueId || data.locationId || '',
    location: (data.venue || data.locationName || '').trim(),
    locationName: (data.venue || data.locationName || '').trim(),
    locationId: data.venueId || data.locationId || '',
    date: data.date,
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    availableFor,
    privateLessonEligibility: Boolean(data.privateLessonEligibility),
    groupSessionEligibility: Boolean(data.groupSessionEligibility),
    privateLessonWillingness: Boolean(data.privateLessonEligibility),
    groupSessionWillingness: Boolean(data.groupSessionEligibility),
    status,
    availabilityStatus: status === 'Approved' || status === 'Available' ? 'Available' : 'Unavailable',
    notes: (data.notes || '').trim(),
    isRecurring: Boolean(data.isRecurring),
    recurringFrequency: data.isRecurring ? data.recurringFrequency || 'Weekly' : null,
    recurringDays: data.isRecurring ? data.recurringDays || [] : null,
    recurringEndDate: data.isRecurring ? data.recurringEndDate || '' : null,
    submittedBy: submittedByUserEmail || data.coachEmail || 'Coach App',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, AVAILABILITY_COLLECTION), payload);
  const docId = docRef.id;

  // If created as Approved, sync to schedules & attendance
  if (status === 'Approved') {
    await syncApprovedAvailabilityToAttendance({
      id: docId,
      coachId: data.coachId || '',
      coachName: data.coachName || '',
      coachPhoto: data.coachPhoto || '',
      venue: data.venue || '',
      venueId: data.venueId || '',
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      status,
    });
  }

  return docId;
}

/**
 * Update an existing Coach Availability record in Firestore
 */
export async function updateCoachAvailability(
  id: string,
  data: Partial<AvailabilityFormData>,
  submittedByUserEmail?: string | null
): Promise<void> {
  const formattedStartTime = data.startTime ? format24HourTime(data.startTime) : undefined;
  const formattedEndTime = data.endTime ? format24HourTime(data.endTime) : undefined;

  let availableFor = data.availableFor;
  if (!availableFor && (data.privateLessonEligibility !== undefined || data.groupSessionEligibility !== undefined)) {
    availableFor = [
      ...(data.privateLessonEligibility ? ['Private Lessons'] : []),
      ...(data.groupSessionEligibility ? ['Group Sessions'] : []),
    ];
  }

  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    ...data,
    updatedAt: now,
  };

  if (formattedStartTime) payload.startTime = formattedStartTime;
  if (formattedEndTime) payload.endTime = formattedEndTime;
  if (availableFor) payload.availableFor = availableFor;
  if (data.venue) {
    payload.venue = data.venue.trim();
    payload.locationName = data.venue.trim();
    payload.location = data.venue.trim();
  }
  if (data.venueId) {
    payload.venueId = data.venueId;
    payload.locationId = data.venueId;
  }
  if (data.privateLessonEligibility !== undefined) {
    payload.privateLessonEligibility = Boolean(data.privateLessonEligibility);
    payload.privateLessonWillingness = Boolean(data.privateLessonEligibility);
  }
  if (data.groupSessionEligibility !== undefined) {
    payload.groupSessionEligibility = Boolean(data.groupSessionEligibility);
    payload.groupSessionWillingness = Boolean(data.groupSessionEligibility);
  }
  if (data.status) {
    payload.status = data.status;
    payload.availabilityStatus = data.status === 'Approved' || data.status === 'Available' ? 'Available' : 'Unavailable';
  }
  if (submittedByUserEmail) {
    payload.updatedBy = submittedByUserEmail;
  }

  const docRef = doc(db, AVAILABILITY_COLLECTION, id);
  await updateDoc(docRef, payload);

  // Sync if status is present
  if (data.status === 'Approved') {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const fresh = docSnap.data();
      await syncApprovedAvailabilityToAttendance({
        id,
        coachId: fresh.coachId || '',
        coachName: fresh.coachName || '',
        coachPhoto: fresh.coachPhoto || '',
        venue: fresh.venue || '',
        venueId: fresh.venueId || '',
        date: fresh.date,
        startTime: fresh.startTime,
        endTime: fresh.endTime,
        status: fresh.status,
      });
    }
  }
}

/**
 * Delete a Coach Availability record from Firestore
 */
export async function deleteCoachAvailability(id: string): Promise<void> {
  const docRef = doc(db, AVAILABILITY_COLLECTION, id);
  const snap = await getDoc(docRef).catch(() => null);
  const availData = snap?.exists() ? snap.data() : null;

  await deleteDoc(docRef);

  // Clean up schedule / attendance with matching shiftId
  try {
    await deleteDoc(doc(db, 'schedules', id)).catch(() => null);
    await deleteDoc(doc(db, 'attendance', id)).catch(() => null);
  } catch (_e) {}

  // If coach had lessons on this date/time, unassign them (same as Dashboard)
  if (availData?.coachId && availData?.date) {
    try {
      const collectionsToClean = ['lessons', 'private_lessons'];
      for (const colName of collectionsToClean) {
        const q = query(
          collection(db, colName),
          where('assignedCoachId', '==', availData.coachId),
          where('date', '==', availData.date)
        );
        const querySnap = await getDocs(q).catch(() => null);
        if (querySnap && !querySnap.empty) {
          for (const d of querySnap.docs) {
            const lessonData = d.data();
            if (!availData.startTime || !lessonData.startTime || lessonData.startTime === availData.startTime) {
              await updateDoc(doc(db, colName, d.id), {
                status: 'Unassigned',
                assignedCoachId: '',
                assignedCoachName: '',
                assignedCoachPhoto: '',
                updatedAt: new Date().toISOString(),
              }).catch(() => null);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[deleteCoachAvailability] Unassign lessons notice:', err);
    }
  }
}

/**
 * Fetch list of venues from Firestore
 */
export async function fetchVenuesList(): Promise<VenueOption[]> {
  try {
    const snap = await getDocs(collection(db, 'venues'));
    const list: VenueOption[] = [];

    snap.forEach((d) => {
      const data = d.data();
      const name = String(data.name || data.venueName || data.title || data.facilityName || '').trim();
      if (name) {
        list.push({
          id: d.id,
          name,
          address: data.address || '',
          city: data.city || data.location || '',
          openingTime: data.openingTime || data.operatingHours?.openTime || '06:00',
          closingTime: data.closingTime || data.operatingHours?.closeTime || '22:00',
          status: data.status || (data.isActive === false ? 'Closed' : 'Operational'),
          isActive: data.isActive !== false,
        });
      }
    });

    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  } catch (error) {
    console.warn('Error fetching venues from Firestore:', error);
    return [];
  }
}
