import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LogOut, CheckCircle2, LogIn, AlertTriangle } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { AttendanceRecord, AttendanceOverride } from '../types';
import { formatDisplayDateTime } from '../utils/date';

interface AttendanceTimelineProps {
  history: AttendanceRecord[];
  overrides: AttendanceOverride[];
}

export const AttendanceTimeline: React.FC<AttendanceTimelineProps> = ({
  history,
  overrides,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>ACTIVITY LOG</Text>
        <Text style={styles.filterText}>Filter ▾</Text>
      </View>

      <View style={styles.timelineList}>
        {history.map((item, index) => {
          const isLast = index === history.length - 1;
          const isOverride = item.verificationStatus === 'Override Approved';
          const isClockOut = !!item.clockOutTime;

          let icon = <LogIn size={16} color={COLORS.textSecondary} />;
          let label = 'Clock In';
          let labelColor = COLORS.textPrimary;
          let subText = item.status === 'Off-Site' ? 'Off site Location' : 'Main Training Facility';

          if (isOverride) {
            icon = <CheckCircle2 size={16} color={COLORS.primary} />;
            label = 'Override Approved';
            labelColor = COLORS.primary;

            const overrideDoc = overrides.find((o) => o.attendanceId === item.attendanceId);
            if (overrideDoc) {
              subText = `Manager: ${overrideDoc.reviewedBy || 'Sarah Jenkins'}\n"${overrideDoc.reason}"`;
            } else {
              subText = 'Manager: Sarah Jenkins\n"Traffic delayed arrival, allowed remote start."';
            }
          } else if (isClockOut) {
            icon = <LogOut size={16} color={COLORS.textSecondary} />;
            label = 'Clock Out';
            subText = 'Main Training Facility';
          }

          return (
            <View key={item.attendanceId || `hist_${index}`} style={styles.timelineItem}>
              {/* Left timeline bar and node icon */}
              <View style={styles.nodeColumn}>
                <View style={styles.nodeIconCircle}>{icon}</View>
                {!isLast && <View style={styles.verticalLine} />}
              </View>

              {/* Content box */}
              <View style={styles.contentColumn}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: labelColor }]}>{label}</Text>
                  <Text style={styles.itemTime}>
                    {formatDisplayDateTime(item.checkInTime || item.clockInTime || new Date().toISOString())}
                  </Text>
                </View>

                {typeof subText === 'string' && subText.includes('\n') ? (
                  <View style={styles.quoteBox}>
                    <Text style={styles.managerText}>{subText.split('\n')[0]}</Text>
                    <Text style={styles.quoteText}>{subText.split('\n')[1]}</Text>
                  </View>
                ) : (
                  <Text style={styles.subText}>{subText}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.8,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  timelineList: {
    paddingLeft: SPACING.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  nodeColumn: {
    alignItems: 'center',
    width: 32,
    marginRight: SPACING.sm,
  },
  nodeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.grayBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 2,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    position: 'absolute',
    top: 28,
    bottom: -16,
  },
  contentColumn: {
    flex: 1,
    paddingTop: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  subText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quoteBox: {
    marginTop: 2,
  },
  managerText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  quoteText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
