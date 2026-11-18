import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  Repeat,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react-native';
import { CoachAvailabilityRecord } from '../types';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { formatTime12h } from '../services/availabilityService';

interface AvailabilityCardProps {
  item: CoachAvailabilityRecord;
  onEdit: (item: CoachAvailabilityRecord) => void;
  onDelete: (item: CoachAvailabilityRecord) => void;
}

const formatReadableDate = (dateStr?: string): string => {
  if (!dateStr) return 'Date not set';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
  } catch (_e) {}
  return dateStr;
};

export const AvailabilityCard: React.FC<AvailabilityCardProps> = ({
  item,
  onEdit,
  onDelete,
}) => {
  const isApproved = item.status === 'Approved' || item.status === 'Available';
  const isRejected = item.status === 'Rejected' || item.status === 'Unavailable';
  const isSubmitted = !isApproved && !isRejected;

  const getStatusBadgeConfig = () => {
    if (isApproved) {
      return {
        label: 'Approved',
        bgColor: '#DCFCE7',
        textColor: '#15803D',
        borderColor: '#BBF7D0',
        Icon: CheckCircle2,
      };
    }
    if (isRejected) {
      return {
        label: 'Rejected',
        bgColor: '#FEE2E2',
        textColor: '#B91C1C',
        borderColor: '#FECACA',
        Icon: XCircle,
      };
    }
    return {
      label: 'Submitted',
      bgColor: '#FEF3C7',
      textColor: '#B45309',
      borderColor: '#FDE68A',
      Icon: AlertCircle,
    };
  };

  const badge = getStatusBadgeConfig();
  const BadgeIcon = badge.Icon;

  const formattedStart = formatTime12h(item.startTime);
  const formattedEnd = formatTime12h(item.endTime);
  const timeDisplay =
    formattedStart && formattedEnd
      ? `${formattedStart} – ${formattedEnd}`
      : formattedStart || formattedEnd || 'Time not set';

  const isPrivate =
    item.privateLessonEligibility ?? item.privateLessonWillingness ?? true;
  const isGroup =
    item.groupSessionEligibility ?? item.groupSessionWillingness ?? true;

  return (
    <View style={styles.cardContainer}>
      {/* Header Row: Date & Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.dateBlock}>
          <Calendar size={15} color={COLORS.montoyaRed} style={styles.iconSpacing} />
          <Text style={styles.dateText}>{formatReadableDate(item.date)}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: badge.bgColor, borderColor: badge.borderColor },
          ]}
        >
          <BadgeIcon size={12} color={badge.textColor} style={{ marginRight: 4 }} />
          <Text style={[styles.statusText, { color: badge.textColor }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Main Info: Time and Venue */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Clock size={15} color="#475569" style={styles.iconSpacing} />
          <Text style={styles.timeText}>{timeDisplay}</Text>
        </View>

        <View style={[styles.infoRow, { marginTop: SPACING.xs }]}>
          <MapPin size={15} color="#64748B" style={styles.iconSpacing} />
          <Text style={styles.venueText} numberOfLines={1}>
            {item.venue || item.locationName || 'Venue not specified'}
          </Text>
        </View>
      </View>

      {/* Tags Row: Private, Group, Recurring */}
      <View style={styles.tagsContainer}>
        {isPrivate && (
          <View style={[styles.tagPill, styles.tagPrivate]}>
            <Text style={styles.tagPrivateText}>Private Lessons</Text>
          </View>
        )}
        {isGroup && (
          <View style={[styles.tagPill, styles.tagGroup]}>
            <Text style={styles.tagGroupText}>Group Sessions</Text>
          </View>
        )}
        {/* {item.isRecurring && (
          <View style={[styles.tagPill, styles.tagRecurring]}>
            <Repeat size={11} color="#4338CA" style={{ marginRight: 3 }} />
            <Text style={styles.tagRecurringText}>
              {item.recurringFrequency || 'Recurring'}
              {item.recurringDays && item.recurringDays.length > 0
                ? ` (${item.recurringDays.map((d) => d.slice(0, 3)).join(', ')})`
                : ''}
            </Text>
          </View>
        )} */}
      </View>

      {/* Notes if provided */}
      {!!item.notes && (
        <View style={styles.notesRow}>
          <FileText size={13} color="#94A3B8" style={styles.iconSpacing} />
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes}
          </Text>
        </View>
      )}

      {/* Rejection reason if provided */}
      {!!item.rejectionReason && (
        <View style={styles.rejectionRow}>
          <AlertCircle size={13} color="#DC2626" style={styles.iconSpacing} />
          <Text style={styles.rejectionText} numberOfLines={2}>
            Reason: {item.rejectionReason}
          </Text>
        </View>
      )}

      {/* Action Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.updatedText}>
          {item.updatedAt ? `Saved ${item.updatedAt.slice(0, 10)}` : ''}
        </Text>

        <View style={styles.actionButtonsGroup}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(item)}
            activeOpacity={0.7}
          >
            <Pencil size={13} color="#1E293B" style={{ marginRight: 4 }} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(item)}
            activeOpacity={0.7}
          >
            <Trash2 size={13} color="#DC2626" style={{ marginRight: 4 }} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: moderateFont(11),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  infoSection: {
    paddingVertical: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpacing: {
    marginRight: 6,
  },
  timeText: {
    fontSize: moderateFont(14),
    fontWeight: '600',
    color: '#1E293B',
  },
  venueText: {
    fontSize: moderateFont(13),
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagPrivate: {
    backgroundColor: '#EFF6FF',
  },
  tagPrivateText: {
    fontSize: moderateFont(11),
    fontWeight: '600',
    color: '#2563EB',
  },
  tagGroup: {
    backgroundColor: '#F3E8FF',
  },
  tagGroupText: {
    fontSize: moderateFont(11),
    fontWeight: '600',
    color: '#7C3AED',
  },
  tagRecurring: {
    backgroundColor: '#EEF2FF',
  },
  tagRecurringText: {
    fontSize: moderateFont(11),
    fontWeight: '600',
    color: '#4338CA',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  notesText: {
    fontSize: moderateFont(12),
    color: '#64748B',
    fontStyle: 'italic',
    flex: 1,
  },
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: RADIUS.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionText: {
    fontSize: moderateFont(12),
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs + 2,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  updatedText: {
    fontSize: moderateFont(10),
    color: '#94A3B8',
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  editButtonText: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: '#1E293B',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: '#DC2626',
  },
});
