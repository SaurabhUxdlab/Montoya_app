import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ScheduleItem,
  AssignedLesson,
  FirestoreScheduleDoc,
  FirestoreSessionDoc,
  LessonType,
  LessonStatus,
} from '../types';
import { parseTimeToMinutes } from '../utils/date';

/**
 * Format 24h time "HH:mm" or ISO time string into 12-hour AM/PM format (e.g., "10:30 AM")
 */
export const formatTime12h = (timeStr?: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();

  // If already in 12-hour format with AM/PM
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  // If ISO string like "2026-09-15T13:00:00.000Z"
  if (trimmed.includes('T')) {
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    } catch (_e) {}
  }

  // If "13:00" or "13:00:00"
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
};

/**
 * Format time range from startTime and endTime (e.g., "11:30 AM - 12:00 PM")
 */
export const formatTimeRange = (start?: string, end?: string): string => {
  const s = formatTime12h(start);
  const e = formatTime12h(end);
  if (s && e) return `${s} - ${e}`;
  if (s) return s;
  if (e) return e;
  return 'Flexible Time';
};

/**
 * Format YYYY-MM-DD date string or ISO date into "MMM d, yyyy" format (e.g. "Sep 16, 2026")
 */
export const formatScheduleDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    let d: Date;
    if (dateStr.includes('T')) {
      d = new Date(dateStr);
    } else {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(dateStr);
      }
    }

    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch (_e) {}

  return dateStr;
};

/**
 * Determine LessonType ('private' | 'group' | 'clinic') from document metadata
 */
export const deriveLessonType = (typeStr?: string, categoryStr?: string, titleStr?: string): LessonType => {
  const combined = `${typeStr || ''} ${categoryStr || ''} ${titleStr || ''}`.toLowerCase();
  if (combined.includes('group') || combined.includes('clinic')) return 'group';
  return 'private';
};

/**
 * Normalize LessonStatus from string
 */
export const deriveLessonStatus = (statusStr?: string): LessonStatus => {
  if (!statusStr) return 'Confirmed';
  const s = statusStr.toLowerCase();
  if (s.includes('confirm')) return 'Confirmed';
  if (s.includes('schedule')) return 'Scheduled';
  if (s.includes('assign')) return 'Assigned';
  if (s.includes('complet')) return 'Completed';
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('pend') || s.includes('review')) return 'Pending';
  return 'Confirmed';
};

export interface CoachSchedulePayload {
  items: ScheduleItem[];
  assignedLessons: AssignedLesson[];
  nextSession: ScheduleItem | null;
}

/**
 * Subscribe to real-time Schedule and Assigned Lessons for a specific coach from Firestore.
 * Strictly enforces the relationship:
 * Availability -> Lesson -> Schedule -> Attendance
 * 
 * Rules:
 * - Only schedules that have assigned lessons in `sessionIds` are displayed.
 * - Schedules with no assigned lessons (empty/missing `sessionIds`) are filtered out.
 * - Lessons are linked to the schedule document reference ID.
 * - No mock or default unassigned schedule fallback data is created.
 */
export const subscribeToCoachSchedule = (
  coachIdOrUid: string,
  onUpdate: (data: CoachSchedulePayload) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!coachIdOrUid) {
    onUpdate({ items: [], assignedLessons: [], nextSession: null });
    return () => {};
  }

  const schedulesRef = collection(db, 'schedules');
  const venuesRef = collection(db, 'venues');

  let latestSchedules: FirestoreScheduleDoc[] = [];
  let directLessonsMap = new Map<string, FirestoreSessionDoc>();
  let venuesMap = new Map<
    string,
    {
      id: string;
      name: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      geofenceRadius?: number;
      courts?: Map<string, string>;
    }
  >();
  let activeDocUnsubs = new Map<string, Unsubscribe>();
  let activeCourtUnsubs = new Map<string, Unsubscribe>();

  const resolveVenueName = (venueId?: string, fallbackVenueName?: string, fallbackVenue?: string): string => {
    if (venueId && venuesMap.has(venueId)) {
      const v = venuesMap.get(venueId);
      if (v?.name) return v.name;
    }
    if (fallbackVenueName && fallbackVenueName.trim()) return fallbackVenueName.trim();
    if (fallbackVenue && fallbackVenue.trim()) return fallbackVenue.trim();
    return 'Venue not assigned';
  };

  const resolveCourtName = (venueId?: string, courtId?: string, fallbackCourtName?: string): string => {
    if (venueId && courtId && venuesMap.has(venueId)) {
      const venueInfo = venuesMap.get(venueId);
      if (venueInfo?.courts?.has(courtId)) {
        return venueInfo.courts.get(courtId) || '';
      }
    }
    if (fallbackCourtName && fallbackCourtName.trim()) return fallbackCourtName.trim();
    return '';
  };

  const processAndEmit = () => {
    const assignedLessonsMap = new Map<string, AssignedLesson>();
    const scheduleItems: ScheduleItem[] = [];

    // Map each valid assigned schedule that contains referenced lessons
    for (const sch of latestSchedules) {
      const schId = sch.id || '';
      const sessionIds = sch.sessionIds;

      // DO NOT show default schedule if it does not have an assigned Lesson/Session
      if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
        continue;
      }

      for (const lessonId of sessionIds) {
        if (!lessonId) continue;
        const lessonDoc = directLessonsMap.get(lessonId);
        if (!lessonDoc) continue; // Only show when the complete relationship exists

        const formattedDate = formatScheduleDate(lessonDoc.date || sch.date);
        const formattedTime = formatTimeRange(lessonDoc.startTime || sch.startTime, lessonDoc.endTime || sch.endTime);
        const venueDisplay = resolveVenueName(lessonDoc.venueId || sch.venueId, lessonDoc.venueName, lessonDoc.venue);
        const courtDisplay = resolveCourtName(lessonDoc.venueId || sch.venueId, lessonDoc.courtId, lessonDoc.courtName);
        const location =
          venueDisplay === 'Venue not assigned'
            ? 'Venue not assigned'
            : courtDisplay
            ? `${venueDisplay} • ${courtDisplay}`
            : venueDisplay;

        const lType = deriveLessonType(
          lessonDoc.sessionType || lessonDoc.bookingType || sch.sessionType || sch.bookingType,
          lessonDoc.category,
          lessonDoc.playerName
        );
        const lStatus = deriveLessonStatus(lessonDoc.status || sch.status);
        const athleteName = lessonDoc.playerName || lessonDoc.athleteName || 'Athlete';
        const category =
          lessonDoc.category ||
          (lType === 'group'
            ? 'Group Clinic'
            : 'Private Lesson');

        const assignedLesson: AssignedLesson = {
          id: lessonId,
          scheduleId: schId, // Connected to Schedule / Attendance reference ID
          athleteName,
          category,
          date: formattedDate || lessonDoc.date || sch.date || 'Today',
          time: formattedTime,
          location,
          status: lStatus,
          type: lType,
          phone: lessonDoc.playerContact || '',
          notes: lessonDoc.notes || '',
          courtId: lessonDoc.courtId,
          courtName: courtDisplay,
          venueId: lessonDoc.venueId || sch.venueId,
          venueName: venueDisplay,
          durationMinutes: lessonDoc.durationMinutes || 30,
          rawDate: lessonDoc.date || sch.date,
          startTimeRaw: lessonDoc.startTime || sch.startTime,
          endTimeRaw: lessonDoc.endTime || sch.endTime,
          assignedCoachId: lessonDoc.assignedCoachId || sch.coachId || coachIdOrUid,
          assignedCoachName: lessonDoc.assignedCoachName || sch.coachName,
          assignedCoachPhoto: lessonDoc.assignedCoachPhoto || sch.coachPhoto,
        };

        assignedLessonsMap.set(lessonId, assignedLesson);

        scheduleItems.push({
          scheduleId: schId,
          coachId: lessonDoc.assignedCoachId || sch.coachId || coachIdOrUid,
          coachName: lessonDoc.assignedCoachName || sch.coachName,
          coachPhoto: lessonDoc.assignedCoachPhoto || sch.coachPhoto,
          venueId: lessonDoc.venueId || sch.venueId,
          venueName: venueDisplay,
          courtId: lessonDoc.courtId,
          courtName: courtDisplay,
          title: athleteName !== 'Athlete' ? `${category} - ${athleteName}` : category,
          date: lessonDoc.date || sch.date,
          startTime: lessonDoc.startTime || sch.startTime,
          endTime: lessonDoc.endTime || sch.endTime,
          notes: lessonDoc.notes || sch.notes,
          status: lStatus === 'Completed' ? 'Completed' : 'Upcoming',
          assignedCoach: lessonDoc.assignedCoachName || sch.coachName || 'Coach',
          sessionIds: [lessonId],
        });
      }
    }

    const assignedLessons = Array.from(assignedLessonsMap.values());

    // Sort assignedLessons by date and startTime
    assignedLessons.sort((a, b) => {
      const dateA = a.rawDate || a.date || '';
      const dateB = b.rawDate || b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.startTimeRaw || '').localeCompare(b.startTimeRaw || '');
    });

    // Sort scheduleItems by date and startTime
    scheduleItems.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    const now = new Date();
    const todayYMD = now.toISOString().split('T')[0];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const upcomingScheduleItems = scheduleItems.filter((item) => {
      if (item.status === 'Completed') return false;
      const itemDate = item.date;
      if (itemDate && itemDate < todayYMD) return false;
      if (itemDate && itemDate === todayYMD && item.endTime) {
        const endMins = parseTimeToMinutes(item.endTime);
        if (endMins !== null && currentMins >= endMins) return false;
      }
      return true;
    });

    const nextSession = upcomingScheduleItems.length > 0 ? upcomingScheduleItems[0] : null;

    onUpdate({
      items: scheduleItems,
      assignedLessons,
      nextSession,
    });
  };

  // Sync child lessons linked via sessionIds array from `lessons` collection
  const syncLinkedSessions = (schedules: FirestoreScheduleDoc[]) => {
    const requiredSessionIds = new Set<string>();
    for (const sch of schedules) {
      if (sch.sessionIds && Array.isArray(sch.sessionIds)) {
        for (const sid of sch.sessionIds) {
          if (sid) requiredSessionIds.add(sid);
        }
      }
    }

    // Unsubscribe from removed IDs
    for (const [sid, unsub] of activeDocUnsubs.entries()) {
      if (!requiredSessionIds.has(sid)) {
        unsub();
        activeDocUnsubs.delete(sid);
        directLessonsMap.delete(sid);
      }
    }

    // Subscribe to each ID in lessons collection
    for (const sid of requiredSessionIds) {
      if (!activeDocUnsubs.has(sid)) {
        const lessonDocRef = doc(db, 'lessons', sid);
        const unsubLesson = onSnapshot(
          lessonDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              directLessonsMap.set(sid, {
                id: docSnap.id,
                ...(docSnap.data() as FirestoreSessionDoc),
              });
            } else {
              directLessonsMap.delete(sid);
            }
            processAndEmit();
          },
          (err) => {
            console.warn(`[ScheduleService] Error listening to lesson ${sid}:`, err);
          }
        );
        activeDocUnsubs.set(sid, unsubLesson);
      }
    }
  };

  // 1. Subscribe to venues collection and their courts subcollections
  const unsubVenues = onSnapshot(
    venuesRef,
    (snapshot) => {
      snapshot.docs.forEach((d) => {
        const data = d.data();
        const venueId = d.id;
        const existingVenue = venuesMap.get(venueId);
        const courtsMap = existingVenue?.courts || new Map<string, string>();

        venuesMap.set(venueId, {
          id: venueId,
          name: data.name || data.venueName || venueId,
          address: data.address || '',
          latitude: Number(data.latitude) || undefined,
          longitude: Number(data.longitude) || undefined,
          geofenceRadius: Number(data.geofenceRadius || data.allowedRadiusMeters) || 150,
          courts: courtsMap,
        });

        // Listen to venues/{venueId}/courts subcollection
        if (!activeCourtUnsubs.has(venueId)) {
          const courtsRef = collection(db, 'venues', venueId, 'courts');
          const unsubCourts = onSnapshot(
            courtsRef,
            (courtSnap) => {
              const v = venuesMap.get(venueId);
              if (v) {
                courtSnap.docs.forEach((cd) => {
                  const cdata = cd.data();
                  v.courts?.set(cd.id, cdata.name || cd.id);
                });
                processAndEmit();
              }
            },
            () => {}
          );
          activeCourtUnsubs.set(venueId, unsubCourts);
        }
      });
      processAndEmit();
    },
    (error) => {
      console.warn('[ScheduleService] Error listening to venues:', error);
    }
  );

  // 2. Subscribe to schedules collection where coachId == coachIdOrUid
  const qSchedules = query(schedulesRef, where('coachId', '==', coachIdOrUid));
  const unsubSchedules = onSnapshot(
    qSchedules,
    (snapshot) => {
      latestSchedules = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreScheduleDoc),
      }));
      syncLinkedSessions(latestSchedules);
      processAndEmit();
    },
    (error) => {
      console.warn('[ScheduleService] Error listening to schedules:', error);
      if (onError) onError(error);
      processAndEmit();
    }
  );

  return () => {
    unsubVenues();
    unsubSchedules();
    for (const unsub of activeDocUnsubs.values()) {
      unsub();
    }
    activeDocUnsubs.clear();
    for (const unsub of activeCourtUnsubs.values()) {
      unsub();
    }
    activeCourtUnsubs.clear();
  };
};

