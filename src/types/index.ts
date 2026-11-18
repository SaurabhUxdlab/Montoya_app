export type UserRole = 'Coach' | 'coach' | 'head_coach' | 'admin' | 'staff' | 'user' | string;

export interface UserDocument {
  uid: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  avatarUrl?: string;
  photoUrl?: string;
  role: UserRole;
  status: 'active' | 'Active' | 'inactive' | 'Inactive' | string;
  academyId?: string;
  createdAt?: string;
  updatedAt?: string;
  fcmTokens?: string[];
}

export interface CoachDocument {
  userId: string; // Foreign key linking to users.uid
  role?: string;
  status?: string;
  experience?: string;
  notes?: string;
  preferredLocations?: string[];
  privateLessonEligibility?: boolean;
  specialties?: string[];
  venue?: string;
  createdAt?: string;
  updatedAt?: string;
  // Backward compatibility / optional fields
  coachId?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  photoUrl?: string;
  avatar?: string;
  image?: string;
  academyId?: string;
  locations?: string[];
  experienceYears?: string;
  experienceBio?: string;
  availabilityStatus?: string;
  availabilityNote?: string;
  settings?: {
    pushNotificationsEnabled?: boolean;
    appSecurityEnabled?: boolean;
  };
}

export interface CoachProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'Active' | 'inactive' | 'Inactive' | string;
  profileImage?: string;
  experience?: string;
  notes?: string;
  preferredLocations?: string[];
  privateLessonEligibility?: boolean;
  specialties?: string[];
  venue?: string;
  createdAt: string;
  updatedAt: string;
  // Optional and legacy compatibility
  userId?: string;
  coachId?: string;
  academyId?: string;
  locations?: string[];
  experienceYears?: string;
  experienceBio?: string;
  availabilityStatus?: string;
  availabilityNote?: string;
  fcmTokens?: string[];
}

export type FacilityType = 'Indoor' | 'Outdoor Complex';
export type SeasonType = 'Winter' | 'Summer';

export interface Facility {
  facilityId: string;
  academyId: string;
  name: string;
  type: FacilityType;
  season: SeasonType;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number; // 50m outdoor, 100m indoor
  status: 'active' | 'maintenance';
}

export type GeofenceStatus = 'On-Site' | 'Boundary Warning' | 'Off-Site';
export type AttendanceStatus =
  | 'Not Started'
  | 'Eligible for Check-In'
  | 'Checked In'
  | 'In Progress'
  | 'Completed'
  | 'Late'
  | 'Missed'
  | 'Cancelled'
  | GeofenceStatus;

export interface AttendanceLocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  capturedAt: string;
}

export type VerificationStatus = 'Verified' | 'Unverified' | 'Pending' | 'Override Requested' | string;

export interface AttendanceRecord {
  attendanceId: string;
  coachId: string;
  userId?: string;
  coachName?: string;
  coachEmail?: string;
  academyId?: string;
  venueId?: string;
  venueName?: string;
  facilityId?: string;
  courtId?: string;
  courtName?: string;
  bookingId?: string;
  sessionId?: string;
  bookingType?: string;
  sessionType?: string;
  date?: string; // YYYY-MM-DD
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  checkInTime?: string;
  clockInTime?: string; // Backward compatibility
  checkOutTime?: string;
  clockOutTime?: string; // Backward compatibility
  checkInLocation?: AttendanceLocationPoint;
  checkOutLocation?: AttendanceLocationPoint;
  checkInDistanceMeters?: number;
  checkOutDistanceMeters?: number;
  latitude?: number; // Backward compatibility
  longitude?: number; // Backward compatibility
  altitude?: number;
  gpsAccuracy?: number; // Backward compatibility
  deviceTimestamp?: string; // Backward compatibility
  serverTimestamp?: string;
  distanceFromVenue?: number; // Backward compatibility
  status: AttendanceStatus;
  verificationStatus?: VerificationStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceOverride {
  overrideId: string;
  coachId: string;
  attendanceId?: string;
  reason: string;
  location: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  actionRequired?: boolean;
}

export interface Player {
  playerId: string;
  academyId: string;
  name: string;
  avatar?: string;
  ranking?: string;
  category?: string;
}

export interface ActivityBlock {
  id: string;
  title: string;
  durationMinutes: number;
  tags: string[];
  intensity?: number; // 1 to 10
  notes?: string;
  avgPaceMph?: number;
  consistencyPct?: number;
}

export interface BillingAllocation {
  playerId: string;
  playerName: string;
  percentage: number;
}

export type SessionType = 'group' | 'private';
export type SessionStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export interface SessionLog {
  sessionId: string;
  coachId: string;
  academyId: string;
  facilityId: string;
  courtId?: string;
  sessionType: SessionType;
  programName?: string;
  estimatedAttendance?: number;
  startTime: string;
  endTime: string;
  duration: number; // total mins
  players: Player[];
  activities: ActivityBlock[];
  billingAllocation: BillingAllocation[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItem {
  scheduleId: string;
  coachId: string;
  coachName?: string;
  coachPhoto?: string;
  academyId?: string;
  facilityId?: string;
  facilityName?: string;
  venueId?: string;
  venueName?: string;
  courtId?: string;
  courtName?: string;
  title: string;
  date?: string;
  startTime: string; // ISO string or Time format (e.g. 10:30)
  endTime: string;   // ISO string or Time format (e.g. 22:00)
  notes?: string;
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled' | 'Scheduled' | 'Assigned';
  assignedCoach?: string;
  latitude?: number;
  longitude?: number;
  sessionIds?: string[];
  bookingType?: string;
  sessionType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DispatchProtocol {
  dispatchId: string;
  coachId: string;
  academyId: string;
  protocolName: string;
  instructor: string;
  facilityId: string;
  facilityName: string;
  courts: string[]; // e.g. ["Courts 1-4 (Hard)", "Courts 5-8 (Clay)"]
  startTime: string;
  endTime: string;
  instructions?: string;
  description?: string;
  triggerConditions?: {
    weatherState?: string;
    temperatureMin?: number;
    temperatureMax?: number;
    delayMinutes?: number;
  };
  actions?: string[];
  status: 'active' | 'inactive' | 'Active' | 'Pending' | 'Completed';
  lastTriggered?: string;
  updatedAt: string;
}

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'session_assigned'
  | 'shift_assigned'
  | 'shift_reminder'
  | 'private_lesson_assigned'
  | 'attendance_approved'
  | 'attendance_rejected'
  | 'availability_approved'
  | 'availability_rejected'
  | 'chat'
  | 'announcement'
  | 'general'
  | 'SHIFT_REMINDER'
  | 'COURT_REASSIGNED'
  | 'VENUE_CHANGED'
  | 'WEATHER_ALERT'
  | 'GEOFENCE_WARNING'
  | 'ATTENDANCE_APPROVED'
  | 'ATTENDANCE_REJECTED'
  | 'DISPATCH_UPDATED'
  | 'SCHEDULE_UPDATED'
  | 'NEW_ASSIGNMENT'
  | 'SESSION_CANCELLED'
  | string;

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  targetScreen?: 'Schedule' | 'CheckIn' | 'Dispatch' | 'Logs' | 'Profile' | 'Chat' | string;
  targetId?: string;
  extraData?: Record<string, any>;
}

export interface QueuedOperation {
  operationId: string;
  operationType: 'clockIn' | 'clockOut' | 'requestOverride' | 'saveSessionLog' | 'authorizeDispatch';
  payload: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export type HourBlockCategory = 'Private Lesson' | 'Group Session' | 'Admin' | 'Break' | 'Uncategorized';

export interface HourBlock {
  id: string;
  startTime: string; // e.g. "01:50 PM"
  endTime: string;   // e.g. "02:00 PM"
  durationLabel: string; // e.g. "10m" or "1h 0m"
  category: HourBlockCategory;
  isConfirmed: boolean;
}

export type SubmissionStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'Declined';

export interface SubmissionItem {
  id: string;
  title: string;
  status: SubmissionStatus;
  date: string; // e.g. "Oct 12"
  time: string; // e.g. "18.00 - 20.00"
  location: string; // e.g. "Court 4"
}

export type LessonType = 'private' | 'group' | 'clinic';
export type LessonStatus = 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'Scheduled' | 'Assigned';

export interface AssignedLesson {
  id: string;
  athleteName: string;
  category: string; // e.g. "Private - Intermediate", "Group Clinic"
  date: string;     // e.g. "Oct 24, 2023"
  time: string;     // e.g. "09:00 AM - 10:30 AM"
  location: string; // e.g. "Riverside Club, Court 4"
  status: LessonStatus;
  type: LessonType;
  phone?: string;
  notes?: string;
  courtId?: string;
  courtName?: string;
  venueId?: string;
  venueName?: string;
  durationMinutes?: number;
  rawDate?: string;
  startTimeRaw?: string;
  endTimeRaw?: string;
  scheduleId?: string;
  assignedCoachId?: string;
  assignedCoachName?: string;
  assignedCoachPhoto?: string;
}

export interface FirestoreScheduleDoc {
  id?: string;
  coachId: string;
  coachName?: string;
  coachPhoto?: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionTitle?: string;
  sessionType?: string;
  bookingType?: string;
  status?: string;
  venue?: string;
  venueName?: string;
  venueId?: string;
  sessionIds?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirestoreSessionDoc {
  id?: string;
  assignedCoachId: string;
  assignedCoachName?: string;
  assignedCoachPhoto?: string;
  playerName?: string;
  athleteName?: string;
  playerContact?: string;
  courtId?: string;
  courtName?: string;
  venueId?: string;
  venue?: string;
  venueName?: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  status?: string;
  notes?: string;
  category?: string;
  bookingType?: string;
  sessionType?: string;
  createdAt?: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// COACH AVAILABILITY TYPES (Matching Dashboard Schema)
// -------------------------------------------------------------
export type AvailabilityStatus = 'Submitted' | 'Approved' | 'Rejected' | 'Available' | 'Unavailable';

export interface CoachAvailabilityRecord {
  id: string;
  coachId: string;
  coachName: string;
  coachEmail?: string;
  coachRole?: string;
  coachPhoto?: string;
  venue: string;
  venueId?: string;
  locationName?: string;
  locationId?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "14:00" or "02:00 PM"
  endTime: string; // e.g. "18:00" or "06:00 PM"
  availableFor?: string[]; // e.g. ["Private Lessons", "Group Sessions"]
  privateLessonEligibility: boolean;
  groupSessionEligibility: boolean;
  privateLessonWillingness?: boolean;
  groupSessionWillingness?: boolean;
  status: AvailabilityStatus;
  availabilityStatus?: 'Available' | 'Unavailable' | string;
  notes?: string;
  rejectionReason?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'Weekly' | 'Bi-Weekly' | 'Monthly' | null;
  recurringDays?: string[] | null;
  recurringEndDate?: string | null;
  submittedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailabilityFormData {
  coachId: string;
  coachName: string;
  coachEmail?: string;
  coachRole?: string;
  coachPhoto?: string;
  venue: string;
  venueId?: string;
  locationName?: string;
  locationId?: string;
  date: string;
  startTime: string;
  endTime: string;
  availableFor?: string[];
  privateLessonEligibility: boolean;
  groupSessionEligibility: boolean;
  privateLessonWillingness?: boolean;
  groupSessionWillingness?: boolean;
  status: AvailabilityStatus;
  availabilityStatus?: 'Available' | 'Unavailable';
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'Weekly' | 'Bi-Weekly' | 'Monthly' | null;
  recurringDays?: string[] | null;
  recurringEndDate?: string | null;
}

export interface VenueOption {
  id: string;
  name: string;
  address?: string;
  city?: string;
  openingTime?: string;
  closingTime?: string;
  status?: string;
  isActive?: boolean;
}

// =============================================================================
// Real-Time Chat & Direct Messaging Types (Synced with Admin Dashboard)
// =============================================================================

export interface MessageAttachment {
  name: string;
  url: string;
  storagePath?: string;
  type: 'image' | 'file';
  size: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'admin' | 'coach' | 'user' | string;
  status?: 'sent' | 'delivered' | 'read';
  timestamp?: any;
  readAt?: any;
  updatedAt?: any;
  isEdited?: boolean;
  attachments?: MessageAttachment[] | null;
}

export interface ChatConversationStats {
  unreadCount: number;
  lastMessageText: string;
  lastMessageSender: string;
  lastMessageAt: number;
}

