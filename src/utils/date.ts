import { AssignedLesson, AttendanceRecord } from '../types';

/**
 * Format ISO string, HH:mm string, or Date to 12-hour time (e.g., "10:00 AM")
 */
export function formatTime(dateStr?: string | Date): string {
  if (!dateStr) return '';
  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    if (/am|pm/i.test(trimmed)) return trimmed;
    
    // Check if HH:mm (e.g., "15:08")
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const parts = trimmed.split(':');
      let hour = parseInt(parts[0], 10);
      const minute = parts[1].padStart(2, '0');
      if (!isNaN(hour)) {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        if (hour === 0) hour = 12;
        return `${hour}:${minute} ${ampm}`;
      }
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return trimmed;
  }
  if (!isNaN(dateStr.getTime())) {
    return dateStr.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  return '';
}

/**
 * Format date string to display format (e.g., "Yesterday, 9:00 AM" or "Today, 2:00 PM")
 */
export function formatDisplayDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // If HH:mm format (e.g., "15:08")
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return `Today, ${formatTime(trimmed)}`;
  }

  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = formatTime(date);

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

/**
 * Calculates countdown string until start time (e.g. "In 45m" or "In 2h 10m")
 */
export function calculateCountdown(targetIsoDate: string): string {
  const target = new Date(targetIsoDate).getTime();
  const now = new Date().getTime();
  const diffMs = target - now;

  if (diffMs <= 0) return 'In Progress';

  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) {
    return `In ${diffMins}m`;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `In ${hours}h ${mins}m`;
}

/**
 * Parse any time string ("19:00", "7:00 PM", "17:30:00", ISO string) into minutes from midnight (0 - 1439)
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  // If ISO string
  if (trimmed.includes('T')) {
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.getHours() * 60 + d.getMinutes();
      }
    } catch {}
  }

  // Check for AM / PM
  const isPM = /pm/i.test(trimmed);
  const isAM = /am/i.test(trimmed);
  const clean = trimmed.replace(/[^\d:]/g, '');
  const parts = clean.split(':').map(Number);
  if (parts.length >= 1 && !isNaN(parts[0])) {
    let hours = parts[0];
    const mins = parts[1] || 0;
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  return null;
}

/**
 * Normalizes any date string (YYYY-MM-DD, ISO string, "Sep 15, 2026") into YYYY-MM-DD
 */
export function normalizeDateToYMD(dateStr?: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return null;
}

/**
 * Determines if a lesson/session is completed based on status, attendance records, and scheduled date/time
 */
export function isLessonCompleted(
  lesson: AssignedLesson,
  attendanceRecords: AttendanceRecord[] = [],
  latestCompletedAttendance: AttendanceRecord | null = null
): boolean {
  if (!lesson) return false;

  // 1. Explicit status check on lesson document
  const status = (lesson.status || '').toLowerCase();
  if (status.includes('complet')) return true;

  const lessonDateYMD =
    normalizeDateToYMD(lesson.rawDate) ||
    normalizeDateToYMD(lesson.date);

  // 2. Cross-reference with Attendance records
  const allCompletedAtts: AttendanceRecord[] = [];
  if (latestCompletedAttendance) {
    allCompletedAtts.push(latestCompletedAttendance);
  }
  (attendanceRecords || []).forEach((att) => {
    const s = (att.status || '').toLowerCase();
    const isOut = !!att.checkOutTime || !!att.clockOutTime || s.includes('complet');
    if (isOut) {
      allCompletedAtts.push(att);
    }
  });

  for (const att of allCompletedAtts) {
    // Direct ID match against bookingId / sessionId / attendanceId / scheduleId
    const isDirectMatch =
      (att.bookingId && (att.bookingId === lesson.id || att.bookingId === lesson.scheduleId)) ||
      (att.sessionId && (att.sessionId === lesson.id || att.sessionId === lesson.scheduleId)) ||
      (att.attendanceId && (att.attendanceId === lesson.id || att.attendanceId === lesson.scheduleId));

    if (isDirectMatch) {
      return true;
    }

    // Date & Venue / Court match
    const attDateYMD =
      normalizeDateToYMD(att.date) ||
      normalizeDateToYMD(att.checkInTime) ||
      normalizeDateToYMD(att.clockInTime);

    if (lessonDateYMD && attDateYMD && lessonDateYMD === attDateYMD) {
      const venueMatch =
        (att.venueId && lesson.venueId && att.venueId === lesson.venueId) ||
        (att.courtId && lesson.courtId && att.courtId === lesson.courtId) ||
        (att.venueName &&
          lesson.venueName &&
          att.venueName.toLowerCase().trim() === lesson.venueName.toLowerCase().trim());

      if (venueMatch) {
        return true;
      }
    }
  }

  // 3. Date & Time comparison against current local time
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayYMD = `${year}-${month}-${day}`;

    if (lessonDateYMD) {
      // Past calendar date (< today)
      if (lessonDateYMD < todayYMD) {
        return true;
      }

      // Today's date -> check if session end time is in the past
      if (lessonDateYMD === todayYMD) {
        const currentMins = now.getHours() * 60 + now.getMinutes();

        let endMins = parseTimeToMinutes(lesson.endTimeRaw);
        if (endMins === null && lesson.time) {
          const parts = lesson.time.split('-');
          if (parts.length === 2) {
            endMins = parseTimeToMinutes(parts[1]);
          } else {
            endMins = parseTimeToMinutes(lesson.time);
          }
        }

        if (endMins !== null && currentMins >= endMins) {
          return true;
        }
      }
    }
  } catch {}

  return false;
}
