import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Calendar,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  Bell,
  User,
  ShieldCheck,
  Megaphone,
  ChevronRight,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { NotificationItem } from '../types';

interface AlertCardProps {
  notification: NotificationItem;
  onPressAction: () => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ notification, onPressAction }) => {
  const typeStr = (notification.type || '').toLowerCase();
  const titleStr = (notification.title || '').toLowerCase();

  const isAnnouncement =
    typeStr.includes('announcement') ||
    titleStr.includes('announcement') ||
    typeStr === 'broadcast';

  const isCancellation =
    typeStr.includes('cancel') ||
    titleStr.includes('cancel') ||
    typeStr === 'booking_cancelled' ||
    typeStr === 'session_cancelled';

  const isWarning =
    typeStr.includes('weather') ||
    typeStr.includes('court') ||
    typeStr.includes('venue') ||
    typeStr.includes('warning') ||
    typeStr.includes('geofence');

  const isAssignment =
    typeStr.includes('assign') ||
    typeStr.includes('shift') ||
    typeStr.includes('lesson') ||
    typeStr.startsWith('booking_') ||
    titleStr.includes('assign') ||
    titleStr.includes('shift') ||
    titleStr.includes('booking') ||
    titleStr.includes('session');

  const isSuccess =
    typeStr.includes('approve') ||
    typeStr.includes('confirm') ||
    titleStr.includes('approve') ||
    titleStr.includes('confirm');

  const isUnread = !notification.read;

  const getIcon = () => {
    if (isAnnouncement) {
      return <Megaphone size={18} color={COLORS.montoyaRed} />;
    }
    if (isCancellation) {
      return <AlertTriangle size={18} color="#DC2626" />;
    }
    if (isWarning) {
      return <AlertTriangle size={18} color="#D97706" />;
    }
    if (isSuccess) {
      return <ShieldCheck size={18} color="#16A34A" />;
    }
    if (isAssignment) {
      return <Calendar size={18} color={COLORS.montoyaRed} />;
    }
    return <Bell size={18} color={COLORS.montoyaRed} />;
  };

  const getTimeLabel = () => {
    try {
      if (!notification.createdAt) return 'Recently';
      const date = new Date(notification.createdAt);
      if (isNaN(date.getTime())) return 'Recently';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);

      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return 'Recently';
    }
  };

  const getBorderColor = () => {
    if (isAnnouncement) return COLORS.montoyaRed;
    if (isCancellation) return '#EF4444';
    if (isWarning) return '#F59E0B';
    if (isSuccess) return '#22C55E';
    return COLORS.montoyaRed;
  };

  const getButtonText = () => {
    if (isAnnouncement) return 'Read Notice';
    if (isAssignment) return 'View Details';
    if (isCancellation) return 'Dismiss';
    if (notification.targetScreen === 'CheckIn') return 'Check In';
    if (notification.targetScreen === 'Profile') return 'View Profile';
    if (notification.targetScreen === 'Schedule') return 'View Schedule';
    return 'View Details';
  };

  const renderBody = () => {
    const rawBody = notification.body || '';
    if (rawBody.includes('\n')) {
      const lines = rawBody.split('\n').filter(Boolean);
      return (
        <View style={styles.assignmentBody}>
          {lines.map((line, idx) => (
            <View key={idx} style={styles.infoRow}>
              {idx === 0 ? (
                <User size={13} color={COLORS.textSecondary} />
              ) : idx === 1 ? (
                <Clock size={13} color={COLORS.textSecondary} />
              ) : (
                <MapPin size={13} color={COLORS.textSecondary} />
              )}
              <Text style={styles.infoText} numberOfLines={1}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    return <Text style={styles.bodyText} numberOfLines={3}>{rawBody}</Text>;
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftColor: getBorderColor() },
        isUnread && styles.cardUnread,
      ]}
      onPress={onPressAction}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.iconContainer,
              isAnnouncement
                ? styles.iconBgBrand
                : isCancellation
                ? styles.iconBgRed
                : isWarning
                ? styles.iconBgYellow
                : isSuccess
                ? styles.iconBgGreen
                : styles.iconBgBrand,
            ]}
          >
            {getIcon()}
          </View>
          <View style={styles.titleTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isAnnouncement && (
                <View style={styles.announcementPill}>
                  <Text style={styles.announcementPillText}>ANNOUNCEMENT</Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.titleText, isUnread && styles.titleTextUnread]}
              numberOfLines={2}
            >
              {notification.title || 'Notification'}
            </Text>
          </View>
        </View>
        <View style={styles.rightGroup}>
          <Text style={styles.timeLabel}>{getTimeLabel()}</Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </View>

      {renderBody()}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            isAnnouncement || isAssignment ? styles.primaryAction : styles.secondaryAction,
          ]}
          onPress={onPressAction}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.actionButtonText,
              isAnnouncement || isAssignment ? styles.primaryActionText : styles.secondaryActionText,
            ]}
          >
            {getButtonText()}
          </Text>
          <ChevronRight
            size={13}
            color={isAnnouncement || isAssignment ? COLORS.white : COLORS.montoyaRed}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#F3E8E8',
    borderLeftWidth: 4,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
    shadowOpacity: 0.04,
  },
  cardUnread: {
    backgroundColor: '#FFFAFA',
    borderColor: '#FECDD3',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 6,
  },
  iconContainer: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgBrand: {
    backgroundColor: '#FCEBEA',
  },
  iconBgRed: {
    backgroundColor: '#FEE2E2',
  },
  iconBgYellow: {
    backgroundColor: '#FEF3C7',
  },
  iconBgGreen: {
    backgroundColor: '#DCFCE7',
  },
  titleTextContainer: {
    flex: 1,
  },
  announcementPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  announcementPillText: {
    fontSize: moderateFont(9),
    fontWeight: '800',
    color: COLORS.montoyaRed,
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: '#334155',
  },
  titleTextUnread: {
    color: '#0F172A',
    fontWeight: '800',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: moderateFont(10),
    color: '#94A3B8',
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.montoyaRed,
  },
  assignmentBody: {
    gap: 4,
    paddingLeft: moderateScale(40),
    marginBottom: SPACING.xs,
    marginTop: 2,
  },
  bodyText: {
    fontSize: moderateFont(12.5),
    color: '#64748B',
    lineHeight: 18,
    paddingLeft: moderateScale(40),
    marginBottom: SPACING.xs,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: moderateFont(12),
    color: '#475569',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  actionButtonText: {
    fontSize: moderateFont(11.5),
    fontWeight: '700',
  },
  primaryAction: {
    backgroundColor: COLORS.montoyaRed,
  },
  primaryActionText: {
    color: COLORS.white,
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  secondaryActionText: {
    color: '#475569',
  },
});
