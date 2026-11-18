import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Activity, Gauge } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';

interface IntensitySliderProps {
  value: number; // 1 - 10
  avgPaceMph?: number;
  consistencyPct?: number;
  onChange: (val: number) => void;
}

export const IntensitySlider: React.FC<IntensitySliderProps> = ({
  value,
  avgPaceMph = 125,
  consistencyPct = 84,
  onChange,
}) => {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>INTENSITY LEVEL</Text>
        <Text style={styles.valueNumber}>{value}</Text>
      </View>

      {/* Interactive slider track */}
      <View style={styles.sliderTrackContainer}>
        <View style={styles.trackBackground}>
          <View
            style={[
              styles.trackFilled,
              { width: `${((value - 1) / 9) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.stepperRow}>
          {levels.map((lvl) => {
            const isSelected = lvl === value;
            return (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.stepDot,
                  isSelected && styles.stepDotSelected,
                  lvl <= value && styles.stepDotFilled,
                ]}
                onPress={() => onChange(lvl)}
                activeOpacity={0.7}
              />
            );
          })}
        </View>

        <View style={styles.labelRow}>
          <Text style={styles.subLabel}>Low</Text>
          <Text style={styles.subLabel}>Max</Text>
        </View>
      </View>

      {/* Sub-stat Cards matching reference design */}
      <View style={styles.statsRow}>
        {/* Avg Pace Card */}
        <View style={styles.statCard}>
          <Gauge size={18} color={COLORS.textSecondary} />
          <Text style={styles.statNumber}>{avgPaceMph}</Text>
          <Text style={styles.statLabel}>AVG PACE (MPH)</Text>
        </View>

        {/* Consistency Card */}
        <View style={styles.statCard}>
          <Activity size={18} color={COLORS.textSecondary} />
          <Text style={styles.statNumber}>{consistencyPct}%</Text>
          <Text style={styles.statLabel}>CONSISTENCY</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  valueNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
  },
  sliderTrackContainer: {
    marginVertical: SPACING.sm,
  },
  trackBackground: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  trackFilled: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: -5,
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  stepDotFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  stepDotSelected: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    marginTop: -2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  subLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.grayBackground,
    borderRadius: RADIUS.xs,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
