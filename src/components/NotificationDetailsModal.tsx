import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Bell,
  ArrowRight,
  ShieldCheck,
  User,
  Megaphone,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { NotificationItem, AssignedLesson } from '../types';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { formatDisplayDateTime } from '../utils/date';

interface NotificationDetailsModalProps {
  visible: boolean;
  notification: NotificationItem | null;
  matchedLesson?: AssignedLesson | null;
  onClose: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToScreen?: (screen: string) => void;
}

export const NotificationDetailsModal: React.FC<NotificationDetailsModalProps> = ({
  visible,
  notification,
  matchedLesson,
  onClose,
  onNavigateToSchedule,
  onNavigateToScreen,
}) => {
  if (!notification) return null;

  const typeStr = (notification.type || '').toLowerCase();
  const titleStr = (notification.title || '').toLowerCase();

  const isAnnouncement =
    typeStr.includes('announcement') ||
    titleStr.includes('announcement') ||
    typeStr === 'broadcast';

  const isCancellation =
    typeStr.includes('cancel') ||
    typeStr === 'booking_cancelled' ||
    typeStr === 'session_cancelled';

  const isWarning =
    typeStr.includes('weather') ||
    typeStr.includes('court') ||
    typeStr.includes('venue') ||
    typeStr.includes('geofence') ||
    typeStr.includes('warning');

  const isSuccess =
    typeStr.includes('approve') ||
    typeStr.includes('confirm') ||
    typeStr === 'booking_confirmed' ||
    typeStr === 'attendance_approved';

  const getHeaderIcon = () => {
    if (isAnnouncement) return <Megaphone size={20} color={COLORS.montoyaRed} />;
    if (isCancellation) return <AlertTriangle size={20} color="#DC2626" />;
    if (isWarning) return <AlertTriangle size={20} color="#D97706" />;
    if (isSuccess) return <ShieldCheck size={20} color="#16A34A" />;
    return <Calendar size={20} color={COLORS.montoyaRed} />;
  };

  const getStatusLabel = () => {
    if (isAnnouncement) return 'Official Announcement';
    if (notification.type === 'shift_assigned' || notification.type === 'NEW_ASSIGNMENT') {
      return 'Shift Assignment';
    }
    if (notification.type === 'booking_created') return 'New Booking';
    if (notification.type === 'booking_confirmed') return 'Booking Confirmed';
    if (notification.type === 'booking_cancelled') return 'Booking Cancelled';
    if (notification.type === 'booking_rescheduled') return 'Booking Rescheduled';
    if (notification.type === 'COURT_REASSIGNED') return 'Court Change';
    if (notification.type === 'VENUE_CHANGED') return 'Venue Change';
    if (notification.type === 'SESSION_CANCELLED') return 'Cancellation';
    if (notification.type === 'attendance_approved') return 'Attendance Approved';
    if (notification.type === 'attendance_rejected') return 'Attendance Rejected';
    if (isWarning) return 'Facility & Weather Alert';
    return 'Notification';
  };

  const getActionButtonTitle = () => {
    if (isAnnouncement) return 'Acknowledge Notice';
    if (notification.targetScreen === 'CheckIn') return 'Go to Check-In';
    if (notification.targetScreen === 'Profile') return 'View Profile';
    if (notification.targetScreen === 'Schedule' || isCancellation) return 'View Schedule';
    return 'View Schedule';
  };

  const handleAction = () => {
    onClose();
    if (isAnnouncement) return;
    if (notification.targetScreen && onNavigateToScreen) {
      onNavigateToScreen(notification.targetScreen);
    } else if (onNavigateToSchedule) {
      onNavigateToSchedule();
    }
  };

  // Attempt to parse structured metadata from body text if lesson wasn't explicitly passed
  const rawBody = notification.body || '';
  const dateMatch =
    rawBody.match(/\b\d{4}-\d{2}-\d{2}\b/) ||
    rawBody.match(
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:, \d{4})?\b/i
    );
  const timeMatch =
    rawBody.match(/\(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\)/) ||
    rawBody.match(
      /\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/
    );
  const venueMatch = rawBody.match(/at\s+([^.\n]+)/i);

  const displayDate = matchedLesson?.date || (dateMatch ? dateMatch[0] : null);
  const displayTime = matchedLesson?.time || (timeMatch ? timeMatch[0].replace(/[()]/g, '') : null);
  const displayVenue = matchedLesson?.location || (venueMatch ? venueMatch[1].trim() : null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.iconBox,
                  isAnnouncement
                    ? styles.iconBoxBrand
                    : isCancellation
                    ? styles.iconBoxCancel
                    : isWarning
                    ? styles.iconBoxWarning
                    : isSuccess
                    ? styles.iconBoxSuccess
                    : styles.iconBoxBrand,
                ]}
              >
                {getHeaderIcon()}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {getStatusLabel()}
                </Text>
                <Text style={styles.timestampText}>
                  {notification.createdAt
                    ? formatDisplayDateTime(notification.createdAt)
                    : 'Recently received'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={styles.titleText}>{notification.title || 'Notification'}</Text>

            {/* Full Message Body Box */}
            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>
                {isAnnouncement ? 'ANNOUNCEMENT DETAILS' : 'MESSAGE'}
              </Text>
              <Text style={styles.messageText}>{notification.body}</Text>
            </View>

            {/* Structured Details (if available or matched from lesson) */}
            {!isAnnouncement && (displayDate || displayTime || displayVenue || matchedLesson) && (
              <View style={styles.shiftDetailsCard}>
                <Text style={styles.sectionHeader}>SESSION / EVENT INFORMATION</Text>

                {displayDate && (
                  <View style={styles.metaRow}>
                    <Calendar size={16} color={COLORS.montoyaRed} />
                    <View style={styles.metaTextCol}>
                      <Text style={styles.metaLabel}>DATE</Text>
                      <Text style={styles.metaValue}>{displayDate}</Text>
                    </View>
                  </View>
                )}

                {displayTime && (
                  <View style={styles.metaRow}>
                    <Clock size={16} color={COLORS.montoyaRed} />
                    <View style={styles.metaTextCol}>
                      <Text style={styles.metaLabel}>SCHEDULED TIME</Text>
                      <Text style={styles.metaValue}>{displayTime}</Text>
                    </View>
                  </View>
                )}

                {displayVenue && (
                  <View style={styles.metaRow}>
                    <MapPin size={16} color={COLORS.montoyaRed} />
                    <View style={styles.metaTextCol}>
                      <Text style={styles.metaLabel}>VENUE & COURT</Text>
                      <Text style={styles.metaValue}>{displayVenue}</Text>
                    </View>
                  </View>
                )}

                {matchedLesson?.notes && (
                  <View style={styles.metaRow}>
                    <Tag size={16} color={COLORS.montoyaRed} />
                    <View style={styles.metaTextCol}>
                      <Text style={styles.metaLabel}>NOTES</Text>
                      <Text style={styles.metaValue}>{matchedLesson.notes}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionRow}>
            <SecondaryButton title="Dismiss" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton
              title={getActionButtonTitle()}
              onPress={handleAction}
              icon={<ArrowRight size={16} color={COLORS.white} />}
              style={{ flex: 1.3, backgroundColor: COLORS.montoyaRed }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  iconBox: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxBrand: {
    backgroundColor: '#FCEBEA',
  },
  iconBoxWarning: {
    backgroundColor: '#FEF3C7',
  },
  iconBoxCancel: {
    backgroundColor: '#FEE2E2',
  },
  iconBoxSuccess: {
    backgroundColor: '#DCFCE7',
  },
  badgeText: {
    fontSize: moderateFont(13),
    fontWeight: '800',
    color: '#1E293B',
  },
  timestampText: {
    fontSize: moderateFont(11),
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    marginBottom: SPACING.lg,
  },
  titleText: {
    fontSize: moderateFont(17),
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: SPACING.md,
  },
  messageBox: {
    backgroundColor: '#FFF9F9',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  messageLabel: {
    fontSize: moderateFont(10),
    fontWeight: '800',
    color: COLORS.montoyaRed,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  messageText: {
    fontSize: moderateFont(13),
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
  shiftDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
    gap: 12,
  },
  sectionHeader: {
    fontSize: moderateFont(10),
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  metaTextCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: moderateFont(9),
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: moderateFont(13),
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
});
