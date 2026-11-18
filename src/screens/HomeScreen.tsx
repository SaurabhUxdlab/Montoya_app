import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import {
  MapPin,
  ChevronRight,
  Bell,
  Star,
  CheckCircle2,
  LogOut,
  Clock,
  ShieldCheck,
  Calendar,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { SectionCard } from '../components/SectionCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { LocationVerificationSheet } from '../components/LocationVerificationSheet';
import {
  performCoachCheckIn,
  performCoachCheckOut,
  subscribeToActiveAttendance,
  getAssignedVenue,
  UNASSIGNED_VENUE,
  AssignedSessionData,
} from '../services/attendanceService';
import {
  clockInSuccess,
  clockOutSuccess,
  setActiveAttendance,
} from '../store/slices/attendanceSlice';
import {
  isLessonCompleted,
  normalizeDateToYMD,
  parseTimeToMinutes,
  formatDisplayDateTime,
  formatTime,
} from '../utils/date';
import { LessonDetailsModal } from '../components/LessonDetailsModal';
import { AssignedLesson, Facility } from '../types';

interface HomeScreenProps {
  onCheckInPress?: () => void;
  onViewAllSchedule: () => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  onChatPress?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onCheckInPress,
  onViewAllSchedule,
  onProfilePress,
  onNotificationPress,
  onChatPress,
}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { clockedIn, activeAttendance, latestCompletedAttendance, attendanceHistory } = useAppSelector(
    (state) => state.attendance
  );
  const { assignedLessons, nextSession, items: scheduleItems, isLoading } = useAppSelector(
    (state) => state.schedule
  );

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [targetVenue, setTargetVenue] = useState<Facility>(UNASSIGNED_VENUE);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [selectedSessionModal, setSelectedSessionModal] = useState<AssignedLesson | null>(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);

  // Subscribe to real-time active attendance
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToActiveAttendance(user.uid, (data) => {
      dispatch(setActiveAttendance(data));
    });
    return () => unsub();
  }, [user?.uid, dispatch]);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Coach';

  // Initials for avatar
  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'C';

  // Format check-in time
  const checkInTimeDisplay = activeAttendance?.checkInTime
    ? formatTime(activeAttendance.checkInTime)
    : activeAttendance?.clockInTime
    ? formatTime(activeAttendance.clockInTime)
    : latestCompletedAttendance?.checkInTime
    ? formatTime(latestCompletedAttendance.checkInTime)
    : '';

  // Format check-out time
  const checkOutTimeDisplay = latestCompletedAttendance?.checkOutTime
    ? formatTime(latestCompletedAttendance.checkOutTime)
    : latestCompletedAttendance?.clockOutTime
    ? formatTime(latestCompletedAttendance.clockOutTime)
    : '';

  // 1. Identify Currently In-Progress Session (if clocked in)
  const inProgressLesson: AssignedLesson | null = useMemo(() => {
    if (!clockedIn && !activeAttendance) return null;
    if (!assignedLessons || assignedLessons.length === 0) return null;

    const matched = assignedLessons.find((l) => {
      if (
        activeAttendance?.sessionId &&
        (l.id === activeAttendance.sessionId || l.scheduleId === activeAttendance.sessionId)
      ) {
        return true;
      }
      if (
        activeAttendance?.bookingId &&
        (l.id === activeAttendance.bookingId || l.scheduleId === activeAttendance.bookingId)
      ) {
        return true;
      }
      return false;
    });

    return matched || assignedLessons[0] || null;
  }, [clockedIn, activeAttendance, assignedLessons]);

  // 2. Identify all valid, non-completed upcoming sessions
  const upcomingLessons: AssignedLesson[] = useMemo(() => {
    if (!assignedLessons || assignedLessons.length === 0) return [];

    const list = assignedLessons.filter((lesson) => {
      // If currently clocked in to this session, exclude from upcoming
      if (
        clockedIn &&
        inProgressLesson &&
        (lesson.id === inProgressLesson.id || lesson.scheduleId === inProgressLesson.scheduleId)
      ) {
        return false;
      }

      // Check if session is already completed via attendance records or past scheduled time
      return !isLessonCompleted(lesson, attendanceHistory, latestCompletedAttendance);
    });

    // Sort ascending by scheduled date and start time
    list.sort((a, b) => {
      const dateA = normalizeDateToYMD(a.rawDate) || normalizeDateToYMD(a.date) || '';
      const dateB = normalizeDateToYMD(b.rawDate) || normalizeDateToYMD(b.date) || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const minsA =
        parseTimeToMinutes(a.startTimeRaw) ??
        parseTimeToMinutes(a.time?.split('-')[0]) ??
        0;
      const minsB =
        parseTimeToMinutes(b.startTimeRaw) ??
        parseTimeToMinutes(b.time?.split('-')[0]) ??
        0;
      return minsA - minsB;
    });

    return list;
  }, [
    assignedLessons,
    clockedIn,
    inProgressLesson,
    attendanceHistory,
    latestCompletedAttendance,
  ]);

  // Nearest relevant upcoming session
  const nextUpcomingLesson: AssignedLesson | null =
    upcomingLessons.length > 0 ? upcomingLessons[0] : null;

  // Active display session (either in-progress or next upcoming)
  const displayLesson: AssignedLesson | null = clockedIn
    ? inProgressLesson
    : nextUpcomingLesson;

  // Has today's shift been completed and no more upcoming sessions remain?
  const isShiftFullyCompletedToday =
    !clockedIn && !!latestCompletedAttendance && !nextUpcomingLesson;

  // Resolved venue name for display
  const activeVenueName =
    activeAttendance?.venueName ||
    displayLesson?.venueName ||
    displayLesson?.location ||
    latestCompletedAttendance?.venueName ||
    'Venue not assigned';

  // Dynamic session payload for check-in
  const activeSessionData: AssignedSessionData = displayLesson
    ? {
        sessionId: displayLesson.id,
        scheduleId: displayLesson.scheduleId || displayLesson.id,
        bookingId: (displayLesson as any).bookingId || displayLesson.id,
        title: displayLesson.category || 'Coaching Session',
        athleteName: displayLesson.athleteName,
        venueId: displayLesson.venueId,
        venueName: displayLesson.venueName,
        courtId: displayLesson.courtId,
        courtName: displayLesson.courtName,
        startTimeText:
          displayLesson.startTimeRaw || displayLesson.time.split('-')[0]?.trim(),
        endTimeText: displayLesson.endTimeRaw || displayLesson.time.split('-')[1]?.trim(),
        startTimeRaw: displayLesson.startTimeRaw,
        endTimeRaw: displayLesson.endTimeRaw,
        dateStr: displayLesson.date,
        rawDate: displayLesson.rawDate,
        assignedCoachId: displayLesson.assignedCoachId || user?.uid,
      }
    : {
        sessionId: (nextSession as any)?.scheduleId || (nextSession as any)?.id || '',
        scheduleId: (nextSession as any)?.scheduleId || (nextSession as any)?.id || '',
        title: nextSession?.title || 'Coaching Session',
        venueId: nextSession?.venueId || '',
        venueName: nextSession?.venueName || 'Venue not assigned',
        startTimeText: nextSession?.startTime || '',
        endTimeText: nextSession?.endTime || '',
      };

  const handleOpenCheckInSheet = async () => {
    if (!displayLesson && !nextSession) {
      Alert.alert(
        'No Upcoming Session',
        'You have no scheduled coaching sessions or shifts assigned right now to check into.'
      );
      return;
    }

    const venueKey =
      displayLesson?.venueId ||
      displayLesson?.venueName ||
      nextSession?.venueId ||
      nextSession?.venueName;

    const resolved = await getAssignedVenue(venueKey);
    setTargetVenue(resolved);
    setVerificationModalVisible(true);
  };

  const handleConfirmLocationCheckIn = async (locData: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    capturedAt: string;
    distanceMeters: number;
  }) => {
    if (!user || !user.uid) {
      Alert.alert('Authentication Error', 'No active coach profile found.');
      return;
    }

    setIsCheckingIn(true);
    try {
      const record = await performCoachCheckIn({
        coach: user,
        session: activeSessionData,
        venue: targetVenue,
        location: {
          latitude: locData.latitude,
          longitude: locData.longitude,
          accuracy: locData.accuracy,
          altitude: locData.altitude,
          capturedAt: locData.capturedAt,
        },
        distanceMeters: locData.distanceMeters,
      });

      dispatch(clockInSuccess(record));
      setVerificationModalVisible(false);
      Alert.alert(
        'Check-In Successful',
        `Location verified! You are checked in for ${displayLesson?.category || 'your session'} at ${targetVenue.name || 'your assigned venue'}.`
      );
    } catch (err: any) {
      console.error('[HomeScreen] Check-in error:', err);
      Alert.alert('Check-In Error', err?.message || 'Failed to complete check-in.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOutPress = () => {
    Alert.alert(
      'Check Out',
      `Ready to complete your shift and check out from ${activeVenueName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Check Out',
          style: 'destructive',
          onPress: async () => {
            if (!activeAttendance?.attendanceId) {
              dispatch(clockOutSuccess(new Date().toISOString()));
              return;
            }

            setIsCheckingOut(true);
            try {
              let posCoords: {
                latitude: number;
                longitude: number;
                accuracy: number;
                altitude?: number;
                capturedAt: string;
              } = {
                latitude: 0,
                longitude: 0,
                accuracy: 10,
                altitude: undefined,
                capturedAt: new Date().toISOString(),
              };

              try {
                const pos = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.High,
                });
                posCoords = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy ?? 10,
                  altitude: pos.coords.altitude ?? undefined,
                  capturedAt: new Date().toISOString(),
                };
              } catch (locErr) {
                console.warn('[HomeScreen] Could not get GPS for check out:', locErr);
              }

              await performCoachCheckOut({
                attendanceId: activeAttendance.attendanceId,
                coach: user || undefined,
                location: posCoords,
              });

              dispatch(clockOutSuccess(new Date().toISOString()));
              Alert.alert(
                'Shift Completed',
                `You have successfully checked out from ${activeVenueName}. Attendance record saved.`
              );
            } catch (err: any) {
              console.error('[HomeScreen] Check out error:', err);
              Alert.alert('Check Out Failed', err?.message || 'Could not complete check-out.');
            } finally {
              setIsCheckingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenLessonDetails = (lesson: AssignedLesson) => {
    setSelectedSessionModal(lesson);
    setIsDetailsModalVisible(true);
  };

  const handleViewNextDetails = () => {
    if (displayLesson) {
      handleOpenLessonDetails(displayLesson);
    } else {
      Alert.alert('No Session', 'No upcoming sessions are currently assigned.');
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Custom Header matching design - Stable at top */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <TouchableOpacity style={styles.profileSection} onPress={onProfilePress}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
            )}
            <Image
              source={require('../../assets/montoyalogo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationBtn} onPress={onNotificationPress}>
            <Bell size={20} color={COLORS.textPrimary} fill={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>Good morning, {firstName}</Text>
          <Text style={styles.subGreeting}>Here is your overview for today.</Text>
        </View>

        {/* Check-In / Check-Out Status Card */}
        <SectionCard style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            <View
              style={[
                styles.locationCircle,
                (clockedIn || isShiftFullyCompletedToday) && styles.locationCircleActive,
              ]}
            >
              {clockedIn || isShiftFullyCompletedToday ? (
                <CheckCircle2 size={26} color="#16A34A" />
              ) : (
                <MapPin size={24} color={COLORS.primary} fill={COLORS.primary} />
              )}
            </View>
          </View>

          <Text style={styles.statusTitle}>
            {clockedIn
              ? "You're checked in"
              : isShiftFullyCompletedToday
              ? 'All Shifts Completed'
              : displayLesson
              ? "You're not checked in"
              : 'No Scheduled Shifts'}
          </Text>

          <Text style={styles.statusSubtitle}>
            {clockedIn
              ? `${activeVenueName} • Checked in at ${checkInTimeDisplay}\nShift is in progress`
              : isShiftFullyCompletedToday
              ? `${latestCompletedAttendance?.venueName || activeVenueName} • Completed at ${checkOutTimeDisplay}\nYou have finished all your scheduled coaching sessions for today.`
              : displayLesson
              ? `Next shift at ${displayLesson.time} at ${displayLesson.venueName || displayLesson.location}`
              : 'You have no active or upcoming coaching sessions assigned for today.'}
          </Text>

          {clockedIn ? (
            <TouchableOpacity
              style={styles.checkOutBtn}
              onPress={handleCheckOutPress}
              disabled={isCheckingOut}
              activeOpacity={0.85}
            >
              {isCheckingOut ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <LogOut size={16} color="#DC2626" />
                  <Text style={styles.checkOutBtnText}>Check Out</Text>
                </>
              )}
            </TouchableOpacity>
          ) : isShiftFullyCompletedToday ? (
            <View style={styles.completedStatusBadge}>
              <CheckCircle2 size={16} color="#15803D" />
              <Text style={styles.completedStatusBadgeText}>Shift Completed</Text>
            </View>
          ) : displayLesson ? (
            <PrimaryButton
              title="Check In Now"
              onPress={handleOpenCheckInSheet}
              style={styles.checkInBtn}
              textStyle={styles.checkInBtnText}
            />
          ) : (
            <TouchableOpacity
              style={styles.viewScheduleEmptyBtnOutline}
              onPress={onViewAllSchedule}
              activeOpacity={0.8}
            >
              <Calendar size={16} color={COLORS.montoyaRed} />
              <Text style={styles.viewScheduleEmptyBtnOutlineText}>View Full Schedule</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Next Assignment Section */}
        <View style={styles.nextAssignmentCard}>
          <View
            style={[
              styles.nextAssignmentHeader,
              clockedIn && styles.inProgressAssignmentHeader,
            ]}
          >
            <Star
              size={12}
              color={clockedIn ? '#15803D' : COLORS.primary}
              fill={clockedIn ? '#15803D' : COLORS.primary}
            />
            <Text
              style={[
                styles.nextAssignmentHeaderText,
                clockedIn && styles.inProgressAssignmentHeaderText,
              ]}
            >
              {clockedIn
                ? 'CURRENT ASSIGNMENT (IN PROGRESS)'
                : 'NEXT ASSIGNMENT'}
            </Text>
          </View>

          <View style={styles.nextAssignmentContent}>
            {displayLesson ? (
              <>
                <View style={styles.assignmentTitleRow}>
                  <Text style={styles.assignmentTitle}>{displayLesson.category}</Text>
                  <View
                    style={[
                      styles.timeBadge,
                      clockedIn && styles.timeBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeBadgeText,
                        clockedIn && styles.timeBadgeTextActive,
                      ]}
                    >
                      {clockedIn ? 'IN PROGRESS' : displayLesson.time}
                    </Text>
                  </View>
                </View>

                <Text style={styles.athleteName}>{displayLesson.athleteName}</Text>

                <View style={styles.locationRow}>
                  <MapPin size={14} color={COLORS.textSecondary} />
                  <Text style={styles.locationText}>{displayLesson.location}</Text>
                </View>

                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={handleViewNextDetails}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewDetailsText}>View Session Details</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Clean Empty State when No Upcoming Sessions */
              <View style={styles.noUpcomingContainer}>
                <View style={styles.noUpcomingIconCircle}>
                  <CheckCircle2
                    size={28}
                    color={latestCompletedAttendance ? '#15803D' : COLORS.montoyaRed}
                  />
                </View>
                <Text style={styles.noUpcomingTitle}>No Upcoming Sessions</Text>
                <Text style={styles.noUpcomingSubtitle}>
                  {latestCompletedAttendance
                    ? "You've completed all your assigned coaching sessions for today. Great job!"
                    : "You're all caught up! When new coaching sessions or shifts are assigned to you, they will appear here."}
                </Text>
                <TouchableOpacity
                  style={styles.viewScheduleEmptyBtn}
                  onPress={onViewAllSchedule}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewScheduleEmptyBtnText}>View Full Schedule</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Today's Schedule Section */}
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>Today's Schedule</Text>
          <TouchableOpacity onPress={onViewAllSchedule} style={styles.viewFullBtn}>
            <Text style={styles.viewFullText}>View Full</Text>
            <ChevronRight size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Timeline Schedule */}
        <View style={styles.timelineContainer}>
          {/* Dynamic items from assignedLessons */}
          {assignedLessons && assignedLessons.length > 0 ? (
            assignedLessons.map((lesson, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === assignedLessons.length - 1;
              const isCompleted = isLessonCompleted(
                lesson,
                attendanceHistory,
                latestCompletedAttendance
              );
              const isCurrent =
                clockedIn &&
                inProgressLesson &&
                (lesson.id === inProgressLesson.id ||
                  lesson.scheduleId === inProgressLesson.scheduleId);

              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.timelineItem}
                  onPress={() => handleOpenLessonDetails(lesson)}
                  activeOpacity={0.7}
                >
                  {isCurrent && <View style={styles.activeIndicator} />}
                  <View style={styles.timeCol}>
                    <Text
                      style={[
                        styles.timelineTime,
                        isCompleted && styles.timelineTimeCompleted,
                      ]}
                    >
                      {lesson.startTimeRaw || lesson.time.split('-')[0].trim()}
                    </Text>
                    {lesson.durationMinutes && (
                      <Text style={styles.duration}>{lesson.durationMinutes} min</Text>
                    )}
                  </View>
                  <View style={styles.lineCol}>
                    <View
                      style={[
                        styles.timelineDotActive,
                        isCurrent && styles.timelineDotInProgress,
                        isCompleted && styles.timelineDotCompleted,
                      ]}
                    />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.contentCol}>
                    <View style={styles.titleWithBadge}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          isCompleted && styles.timelineTitleCompletedText,
                        ]}
                        numberOfLines={1}
                      >
                        {lesson.category}
                      </Text>
                      <View
                        style={[
                          styles.nextBadge,
                          isCurrent && styles.inProgressBadge,
                          isCompleted && styles.completedBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.nextBadgeText,
                            isCurrent && styles.inProgressBadgeText,
                            isCompleted && styles.completedBadgeText,
                          ]}
                        >
                          {isCurrent
                            ? 'IN PROGRESS'
                            : isCompleted
                            ? 'COMPLETED'
                            : lesson.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.coachRow}>
                      <Text style={styles.coachIcon}>👤</Text>
                      <Text style={styles.timelineSub} numberOfLines={1}>
                        {lesson.athleteName} • {lesson.location}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={[styles.timelineItem, { paddingVertical: SPACING.md }]}>
              <View style={styles.contentCol}>
                <Text style={[styles.timelineSub, { fontStyle: 'italic' }]}>
                  No schedule assigned for today.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Location Verification Sheet */}
      <LocationVerificationSheet
        visible={verificationModalVisible}
        onClose={() => setVerificationModalVisible(false)}
        onConfirmCheckIn={handleConfirmLocationCheckIn}
        session={activeSessionData}
        venue={targetVenue}
        isSubmitting={isCheckingIn}
      />

      {/* Dynamic Session Detail Modal */}
      <LessonDetailsModal
        visible={isDetailsModalVisible}
        lesson={selectedSessionModal}
        onClose={() => setIsDetailsModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFF9F9',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingTop: 0,
    paddingBottom: moderateScale(100),
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFF9F9',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(123, 8, 24, 0.05)',
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
  },
  headerAvatarFallback: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: moderateFont(10),
    fontWeight: '700',
    color: COLORS.montoyaRed,
  },
  brandLogo: {
    width: moderateScale(110),
    height: moderateScale(30),
    marginLeft: moderateScale(4),
  },
  notificationBtn: {
    padding: 4,
  },
  greetingSection: {
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  greetingText: {
    fontSize: moderateFont(24),
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subGreeting: {
    fontSize: moderateFont(14),
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  statusIconContainer: {
    marginBottom: SPACING.md,
  },
  locationCircle: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCircleActive: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  statusTitle: {
    fontSize: moderateFont(18),
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: moderateFont(12),
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
  checkInBtn: {
    width: '100%',
    backgroundColor: COLORS.montoyaRed,
    borderRadius: RADIUS.sm,
  },
  checkInBtnText: {
    textTransform: 'none',
    fontSize: moderateFont(14),
    fontWeight: '700',
  },
  checkOutBtn: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkOutBtnText: {
    color: '#DC2626',
    fontSize: moderateFont(14),
    fontWeight: '800',
  },
  nextAssignmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    overflow: 'hidden',
    marginBottom: SPACING.xxl,
    ...SHADOWS.card,
  },
  nextAssignmentHeader: {
    backgroundColor: '#FFF1F1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 6,
    gap: 6,
  },
  inProgressAssignmentHeader: {
    backgroundColor: '#F0FDF4',
  },
  nextAssignmentHeaderText: {
    fontSize: moderateFont(10),
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  inProgressAssignmentHeaderText: {
    color: '#15803D',
  },
  nextAssignmentContent: {
    padding: SPACING.lg,
  },
  assignmentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignmentTitle: {
    fontSize: moderateFont(18),
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  timeBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  timeBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  timeBadgeText: {
    fontSize: moderateFont(11),
    fontWeight: '800',
    color: COLORS.montoyaRed,
  },
  timeBadgeTextActive: {
    color: '#15803D',
  },
  athleteName: {
    fontSize: moderateFont(14),
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xl,
  },
  locationText: {
    fontSize: moderateFont(12),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  viewDetailsBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.montoyaRed,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: COLORS.montoyaRed,
    fontWeight: '700',
    fontSize: moderateFont(13),
  },
  noUpcomingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: 6,
  },
  noUpcomingIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FCEBEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noUpcomingTitle: {
    fontSize: moderateFont(16),
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  noUpcomingSubtitle: {
    fontSize: moderateFont(13),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
    marginBottom: 8,
  },
  viewScheduleEmptyBtn: {
    backgroundColor: COLORS.montoyaRed,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.xs,
  },
  viewScheduleEmptyBtnText: {
    color: '#FFFFFF',
    fontSize: moderateFont(12),
    fontWeight: '700',
  },
  viewScheduleEmptyBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.montoyaRed,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  viewScheduleEmptyBtnOutlineText: {
    color: COLORS.montoyaRed,
    fontSize: moderateFont(13),
    fontWeight: '700',
  },
  completedStatusBadge: {
    width: '100%',
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completedStatusBadgeText: {
    color: '#15803D',
    fontSize: moderateFont(14),
    fontWeight: '800',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  scheduleTitle: {
    fontSize: moderateFont(20),
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  viewFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewFullText: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: COLORS.montoyaRed,
  },
  timelineContainer: {
    paddingLeft: moderateScale(4),
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
    height: moderateScale(80),
    position: 'relative',
  },
  timeCol: {
    width: moderateScale(60),
    alignItems: 'flex-end',
    paddingRight: SPACING.md,
  },
  timelineTime: {
    fontSize: moderateFont(12),
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  timelineTimeCompleted: {
    color: '#94A3B8',
  },
  duration: {
    fontSize: moderateFont(10),
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lineCol: {
    alignItems: 'center',
    width: moderateScale(20),
    height: '100%',
  },
  timelineDotActive: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: COLORS.montoyaRed,
    marginTop: moderateScale(4),
  },
  timelineDotInProgress: {
    backgroundColor: '#16A34A',
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
  },
  timelineDotCompleted: {
    backgroundColor: '#94A3B8',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#FEE2E2',
    marginVertical: moderateScale(2),
  },
  contentCol: {
    flex: 1,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timelineTitle: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  timelineTitleCompletedText: {
    color: '#64748B',
  },
  nextBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginLeft: 6,
  },
  inProgressBadge: {
    backgroundColor: '#DCFCE7',
  },
  completedBadge: {
    backgroundColor: '#F1F5F9',
  },
  nextBadgeText: {
    fontSize: moderateFont(9),
    fontWeight: '800',
    color: COLORS.montoyaRed,
  },
  inProgressBadgeText: {
    color: '#15803D',
  },
  completedBadgeText: {
    color: '#64748B',
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  coachIcon: {
    fontSize: 11,
  },
  timelineSub: {
    fontSize: moderateFont(11),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    left: -8,
    top: 6,
    bottom: 6,
    width: 3,
    backgroundColor: '#16A34A',
    borderRadius: 2,
  },
});
