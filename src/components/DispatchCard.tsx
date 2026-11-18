import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, ShieldAlert } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { DispatchProtocol } from '../types';

interface CourtOption {
  id: string;
  name: string;
  type: string;
  checked: boolean;
}

interface DispatchCardProps {
  courtOptions: CourtOption[];
  onToggleCourt: (id: string) => void;
  activeProtocols: DispatchProtocol[];
}

export const DispatchCard: React.FC<DispatchCardProps> = ({
  courtOptions,
  onToggleCourt,
  activeProtocols,
}) => {
  return (
    <View style={styles.container}>
      {/* Court Allocation Checkbox Grid */}
      <Text style={styles.sectionLabel}>COURT ALLOCATION</Text>

      <View style={styles.gridContainer}>
        {courtOptions.map((court) => (
          <TouchableOpacity
            key={court.id}
            style={[
              styles.courtCard,
              court.checked && styles.courtCardChecked,
            ]}
            onPress={() => onToggleCourt(court.id)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                court.checked && styles.checkboxChecked,
              ]}
            >
              {court.checked && <Check size={12} color={COLORS.white} strokeWidth={3} />}
            </View>

            <View style={styles.courtTextGroup}>
              <Text style={styles.courtName}>{court.name}</Text>
              <Text style={styles.courtType}>({court.type})</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Protocols List Section */}
      <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>ACTIVE PROTOCOLS</Text>

      <View style={styles.activeList}>
        {activeProtocols.map((proto) => (
          <View key={proto.dispatchId} style={styles.protocolCard}>
            <View style={styles.protocolMain}>
              <Text style={styles.protocolTitle}>{proto.protocolName}</Text>
              <Text style={styles.protocolSub}>
                {proto.instructor} · {proto.courts.join(', ')}
              </Text>
            </View>
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>
                {proto.startTime} - {proto.endTime}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  courtCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xs,
    padding: SPACING.md,
    gap: 8,
  },
  courtCardChecked: {
    borderColor: COLORS.primary,
    backgroundColor: '#FEF2F2',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: COLORS.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  courtTextGroup: {
    flex: 1,
  },
  courtName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  courtType: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  activeList: {
    gap: SPACING.md,
  },
  protocolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  protocolMain: {
    flex: 1,
  },
  protocolTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  protocolSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timeBadge: {
    backgroundColor: COLORS.grayBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
