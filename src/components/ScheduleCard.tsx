import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { MapPin, Navigation, Clock } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { ScheduleItem } from '../types';
import { formatTime, calculateCountdown } from '../utils/date';

interface ScheduleCardProps {
  item: ScheduleItem;
  isNextSession?: boolean;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  item,
  isNextSession = false,
}) => {
  const openMaps = () => {
    const lat = item.latitude;
    const lng = item.longitude;
    const label = encodeURIComponent(item.facilityName || item.venueName || 'Venue');

    const scheme = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      web: `https://maps.google.com/?q=${lat},${lng}`,
    });

    if (scheme) {
      Linking.openURL(scheme).catch(() => {
        Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
      });
    }
  };

  if (isNextSession) {
    const countdown = calculateCountdown(item.startTime);

    return (
      <View style={[styles.nextSessionCard, SHADOWS.accent]}>
        {/* Tennis Ball Graphic Accent Circle */}
        <View style={styles.tennisBallGraphic}>
          <View style={styles.ballSeamLeft} />
          <View style={styles.ballSeamRight} />
        </View>

        {/* Top Tag Row */}
        <View style={styles.topRow}>
          <View style={styles.nextTag}>
            <Clock size={12} color={COLORS.white} />
            <Text style={styles.nextTagText}>NEXT SESSION</Text>
          </View>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        </View>

        {/* Session Details */}
        <Text style={styles.titleLarge}>{item.title}</Text>

        <View style={styles.locationRow}>
          <MapPin size={14} color={COLORS.textSecondary} />
          <Text style={styles.locationText}>
            {item.courtName}, {item.facilityName}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>TIME</Text>
            <Text style={styles.metaValue}>{formatTime(item.startTime)}</Text>
          </View>

          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>COACH</Text>
            <Text style={styles.metaValue}>{item.assignedCoach}</Text>
          </View>

          <TouchableOpacity
            style={styles.navButton}
            onPress={openMaps}
            activeOpacity={0.8}
          >
            <Navigation size={14} color={COLORS.white} />
            <Text style={styles.navButtonText}>Nav</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Standard Schedule Timeline Item (e.g. TODAY 1:30 PM)
  return (
    <View style={styles.standardItem}>
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{formatTime(item.startTime)}</Text>
      </View>

      <View style={styles.dividerLine} />

      <TouchableOpacity
        style={styles.contentBox}
        onPress={openMaps}
        activeOpacity={0.8}
      >
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSub}>{item.notes}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  nextSessionCard: {
    backgroundColor: '#FAF5EF', // Warm cream background matching reference graphic
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2D8CE',
    padding: SPACING.xl,
    marginBottom: SPACING.xxl,
    position: 'relative',
    overflow: 'hidden',
  },
  tennisBallGraphic: {
    position: 'absolute',
    right: -25,
    top: -15,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(214, 0, 0, 0.06)',
    borderWidth: 8,
    borderColor: 'rgba(214, 0, 0, 0.08)',
  },
  ballSeamLeft: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderLeftWidth: 3,
    borderColor: 'rgba(214, 0, 0, 0.15)',
    top: 20,
    left: 10,
  },
  ballSeamRight: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderRightWidth: 3,
    borderColor: 'rgba(214, 0, 0, 0.15)',
    top: 20,
    right: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  nextTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextTagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  countdownBadge: {
    backgroundColor: COLORS.grayBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  titleLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.lg,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'column',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  navButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  standardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  timeColumn: {
    width: 65,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dividerLine: {
    width: 3,
    height: 44,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  contentBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
