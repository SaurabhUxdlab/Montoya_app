import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, LogIn } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAppSelector } from '../hooks/redux';

interface ReadyToClockInScreenProps {
  onClockIn: () => void;
  onCancel: () => void;
}

export const ReadyToClockInScreen: React.FC<ReadyToClockInScreenProps> = ({
  onClockIn,
  onCancel,
}) => {
  const { activeFacility } = useAppSelector((state) => state.attendance);
  const { nextSession, assignedLessons } = useAppSelector((state) => state.schedule);

  const primary = assignedLessons && assignedLessons.length > 0 ? assignedLessons[0] : null;
  const facilityName = activeFacility?.name || primary?.venueName || nextSession?.venueName || 'Venue not assigned';
  const sessionTitle = primary ? `${primary.category}${primary.athleteName ? ` - ${primary.athleteName}` : ''}` : nextSession?.title || 'Coaching Session';
  const sessionTime = primary?.time || (nextSession?.startTime ? `${nextSession.startTime} - ${nextSession.endTime}` : 'Scheduled Shift');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.checkCircle}>
            <Check size={32} color="#16A34A" strokeWidth={3} />
          </View>
        </View>

        <Text style={styles.title}>Location Verified</Text>

        <Text style={styles.description}>
          You're at <Text style={styles.bold}>{facilityName}</Text>. Ready to start your shift?
        </Text>

        {/* Scheduled Next Card */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionIconBox}>
             {/* Simple racket icon representation */}
             <Text style={styles.racketIcon}>🎾</Text>
          </View>
          <View style={styles.sessionInfo}>
             <Text style={styles.sessionLabel}>SCHEDULED NEXT</Text>
             <Text style={styles.sessionTitle}>{sessionTitle}</Text>
             <View style={styles.timeRow}>
                <Text style={styles.clockIcon}>🕒</Text>
                <Text style={styles.sessionTime}>{sessionTime}</Text>
             </View>
          </View>
        </View>

        {/* Clock In Button */}
        <TouchableOpacity style={styles.clockInBtn} onPress={onClockIn}>
          <LogIn size={20} color={COLORS.white} />
          <Text style={styles.clockInText}>Clock In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.accent,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  checkCircle: {
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: RADIUS.md,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: moderateFont(22),
    fontWeight: '800',
    color: '#3F2C2C', // Dark brown/gray text from design
    textAlign: 'center',
    marginBottom: moderateScale(6),
  },
  description: {
    fontSize: moderateFont(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },
  bold: {
    fontWeight: '800',
    color: '#3F2C2C',
  },
  sessionCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sessionIconBox: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: RADIUS.sm,
    backgroundColor: '#F3E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  racketIcon: {
    fontSize: 20,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionLabel: {
    fontSize: moderateFont(9),
    fontWeight: '800',
    color: COLORS.montoyaRed,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sessionTitle: {
    fontSize: moderateFont(16),
    fontWeight: '800',
    color: '#3F2C2C',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockIcon: {
    fontSize: 12,
  },
  sessionTime: {
    fontSize: moderateFont(12),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  clockInBtn: {
    width: '100%',
    backgroundColor: '#22C55E', // Standard green for success
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.md,
    ...SHADOWS.accent,
  },
  clockInText: {
    color: COLORS.white,
    fontSize: moderateFont(15),
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: SPACING.sm,
  },
  cancelText: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: COLORS.montoyaRed,
  },
});
