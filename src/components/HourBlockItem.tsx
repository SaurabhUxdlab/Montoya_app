import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PlusCircle, Edit3 } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { HourBlock } from '../types';

interface HourBlockItemProps {
  block: HourBlock;
  isLast?: boolean;
  onPress: () => void;
}

export const HourBlockItem: React.FC<HourBlockItemProps> = ({ block, isLast, onPress }) => {
  const isUncategorized = block.category === 'Uncategorized';

  const getCategoryColor = () => {
    switch (block.category) {
      case 'Private Lesson': return COLORS.montoyaRed;
      case 'Group Session': return '#075985'; // Deep blue
      case 'Admin': return '#92400E'; // Brownish
      case 'Break': return '#94A3B8'; // Slate
      default: return 'transparent';
    }
  };

  const getBackgroundColor = () => {
     if (isUncategorized) return '#FCEBEA'; // Very light brand red
     if (block.category === 'Group Session') return '#E0F2FE'; // Light blue
     if (block.category === 'Private Lesson') return '#FCEBEA'; // Brand light red
     return '#F8FAFC'; // Neutral
  };

  return (
    <View style={styles.container}>
      {/* Time column */}
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{block.startTime}</Text>
        {!isLast && <View style={styles.verticalLine} />}
        {isLast && <Text style={[styles.timeText, styles.lastTime]}>{block.endTime}</Text>}
      </View>

      {/* Card Content */}
      <TouchableOpacity
        style={[
            styles.card,
            { backgroundColor: getBackgroundColor(), borderLeftColor: getCategoryColor() },
            !isUncategorized && styles.categorizedCard
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardInfo}>
          <Text style={[
              styles.categoryTitle,
              isUncategorized && styles.uncategorizedTitle
          ]}>
            {block.category === 'Uncategorized' ? 'Uncategorized Time' : block.category}
          </Text>
          <Text style={styles.durationLabel}>{block.durationLabel}</Text>
        </View>

        <View style={styles.actionIcon}>
          {isUncategorized ? (
            <PlusCircle size={20} color={COLORS.montoyaRed} />
          ) : (
            <Edit3 size={18} color="#3F2C2C" />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 0,
    minHeight: moderateScale(80),
  },
  timeColumn: {
    width: moderateScale(60),
    alignItems: 'center',
    paddingTop: 4,
  },
  timeText: {
    fontSize: moderateFont(11),
    fontWeight: '700',
    color: '#64748B',
  },
  lastTime: {
    marginTop: 'auto',
    marginBottom: 4,
  },
  verticalLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  card: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginLeft: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOWS.card,
  },
  categorizedCard: {
    borderLeftWidth: 5,
  },
  cardInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: moderateFont(16),
    fontWeight: '800',
    color: '#3F2C2C',
    marginBottom: 2,
  },
  uncategorizedTitle: {
    fontSize: moderateFont(14),
    fontWeight: '600',
    color: '#64748B',
  },
  durationLabel: {
    fontSize: moderateFont(12),
    color: '#94A3B8',
    fontWeight: '600',
  },
  actionIcon: {
    marginLeft: SPACING.sm,
  }
});
