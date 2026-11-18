import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Clock, MapPin, User, Users, CheckCircle2 } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { AssignedLesson } from '../types';
import { isLessonCompleted } from '../utils/date';

interface AssignedLessonCardProps {
  item: AssignedLesson;
  isCompleted?: boolean;
  onViewDetails: (item: AssignedLesson) => void;
}

export const AssignedLessonCard: React.FC<AssignedLessonCardProps> = ({
  item,
  isCompleted: propIsCompleted,
  onViewDetails,
}) => {
  const isPrivate = item.type === 'private';
  const completed = propIsCompleted !== undefined ? propIsCompleted : isLessonCompleted(item);

  return (
    <View style={[styles.cardContainer, completed ? styles.completedCard : styles.upcomingCard]}>
      {/* Top Header Row: Status Badge & Category Icon */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, completed ? styles.completedBadge : styles.confirmedBadge]}>
          {completed && <CheckCircle2 size={12} color="#15803D" style={{ marginRight: 4 }} />}
          <Text style={[styles.badgeText, completed ? styles.completedBadgeText : styles.confirmedBadgeText]}>
            {completed ? 'Completed' : item.status || 'Upcoming'}
          </Text>
        </View>

        <View style={styles.iconBox}>
          {isPrivate ? (
            <User size={18} color={completed ? '#64748B' : '#7B0818'} />
          ) : (
            <Users size={18} color={completed ? '#64748B' : '#7B0818'} />
          )}
        </View>
      </View>

      {/* Athlete Name & Category */}
      <Text style={[styles.athleteName, completed && styles.completedAthleteName]}>
        {item.athleteName}
      </Text>
      <Text style={styles.categoryText}>{item.category}</Text>

      {/* Meta info rows with icons */}
      <View style={styles.metaContainer}>
        {/* Date Row */}
        <View style={styles.metaRow}>
          <Calendar size={15} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.date}</Text>
        </View>

        {/* Time Row */}
        <View style={styles.metaRow}>
          <Clock size={15} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.time}</Text>
        </View>

        {/* Location Row */}
        <View style={styles.metaRow}>
          <MapPin size={15} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.viewDetailsBtn, completed && styles.viewDetailsBtnCompleted]}
        onPress={() => onViewDetails(item)}
        activeOpacity={0.8}
      >
        <Text style={[styles.viewDetailsBtnText, completed && styles.viewDetailsBtnTextCompleted]}>
          {completed ? 'View Summary' : 'View Details'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...SHADOWS.card,
  },
  upcomingCard: {
    borderLeftColor: '#16A34A', // Green accent line for upcoming
  },
  completedCard: {
    borderLeftColor: '#94A3B8', // Slate accent for completed
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFBFD',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: RADIUS.xs,
  },
  confirmedBadge: {
    backgroundColor: '#FEE2E2', // Light rose badge
  },
  completedBadge: {
    backgroundColor: '#DCFCE7', // Soft green badge
  },
  badgeText: {
    fontSize: moderateFont(11),
    fontWeight: '700',
  },
  confirmedBadgeText: {
    color: '#991B1B',
  },
  completedBadgeText: {
    color: '#15803D',
  },
  iconBox: {
    padding: 2,
  },
  athleteName: {
    fontSize: moderateFont(20),
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  completedAthleteName: {
    color: '#334155',
  },
  categoryText: {
    fontSize: moderateFont(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  metaContainer: {
    gap: moderateScale(8),
    marginBottom: SPACING.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  metaText: {
    fontSize: moderateFont(13),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  viewDetailsBtn: {
    width: '100%',
    backgroundColor: '#7B0818', // Montoya burgundy red
    borderRadius: RADIUS.xs,
    paddingVertical: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsBtnCompleted: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  viewDetailsBtnText: {
    color: COLORS.white,
    fontSize: moderateFont(14),
    fontWeight: '700',
  },
  viewDetailsBtnTextCompleted: {
    color: '#475569',
  },
});
