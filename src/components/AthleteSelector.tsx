import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { Player } from '../types';

interface AthleteSelectorProps {
  selectedAthletes: Player[];
  onOpenModal: () => void;
  onRemoveAthlete: (player: Player) => void;
}

export const AthleteSelector: React.FC<AthleteSelectorProps> = ({
  selectedAthletes,
  onOpenModal,
  onRemoveAthlete,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>ATHLETES</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{selectedAthletes.length} SELECTED</Text>
        </View>
      </View>

      <View style={styles.avatarRow}>
        {selectedAthletes.map((player) => (
          <View key={player.playerId} style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              {player.avatar ? (
                <Image source={{ uri: player.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitials}>{player.name[0]}</Text>
              )}
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => onRemoveAthlete(player)}
                activeOpacity={0.7}
              >
                <X size={10} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.playerName} numberOfLines={1}>
              {player.name}
            </Text>
          </View>
        ))}

        {/* Add Athlete Button */}
        <TouchableOpacity style={styles.addButton} onPress={onOpenModal} activeOpacity={0.7}>
          <View style={styles.addCircle}>
            <Plus size={18} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.addLabel}>ADD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: COLORS.grayBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarWrapper: {
    alignItems: 'center',
    width: 60,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.grayBackground,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  removeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  addButton: {
    alignItems: 'center',
    width: 60,
  },
  addCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.grayBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
