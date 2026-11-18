import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { SubmissionItem, SubmissionStatus } from '../types';

interface SubmissionCardProps {
  item: SubmissionItem;
}

export const SubmissionCard: React.FC<SubmissionCardProps> = ({ item }) => {
  const getStatusConfig = (status: SubmissionStatus) => {
    switch (status) {
      case 'Submitted':
        return {
          color: COLORS.montoyaRed,
          bgColor: '#FCEBEA',
          badgeBg: '#FCEBEA',
          badgeText: COLORS.montoyaRed,
        };
      case 'Under Review':
        return {
          color: '#EAB308', // Amber/Yellow
          bgColor: '#FEFCE8',
          badgeBg: '#FEFCE8',
          badgeText: '#854D0E',
        };
      case 'Assigned':
        return {
          color: '#16A34A', // Green
          bgColor: '#F0FDF4',
          badgeBg: '#DCFCE7',
          badgeText: '#166534',
        };
      case 'Declined':
        return {
          color: '#DC2626', // Red
          bgColor: '#FEF2F2',
          badgeBg: '#FEE2E2',
          badgeText: '#991B1B',
        };
      default:
        return {
          color: COLORS.textSecondary,
          bgColor: COLORS.grayBackground,
          badgeBg: COLORS.grayBackground,
          badgeText: COLORS.textSecondary,
        };
    }
  };

  const config = getStatusConfig(item.status);

  return (
    <View style={[styles.card, { borderLeftColor: config.color }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: config.badgeBg }]}>
          <Text style={[styles.badgeText, { color: config.badgeText }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.infoRow}>
          <Calendar size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{item.date}</Text>
        </View>
        <View style={styles.infoRow}>
          <Clock size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{item.time}</Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 5,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: moderateFont(18),
    fontWeight: '800',
    color: '#3F2C2C',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: moderateFont(10),
    fontWeight: '700',
  },
  detailsContainer: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: moderateFont(13),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
