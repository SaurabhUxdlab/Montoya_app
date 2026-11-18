import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { X, Calendar, Clock, MapPin, Phone, ShieldCheck, User, Users } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { AssignedLesson } from '../types';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

interface LessonDetailsModalProps {
  visible: boolean;
  lesson: AssignedLesson | null;
  onClose: () => void;
  onClockIn?: (lesson: AssignedLesson) => void;
}

export const LessonDetailsModal: React.FC<LessonDetailsModalProps> = ({
  visible,
  lesson,
  onClose,
  onClockIn,
}) => {
  if (!lesson) return null;

  const handleContact = () => {
    if (lesson.phone) {
      Alert.alert('Contact Athlete', `Calling ${lesson.athleteName} at ${lesson.phone}`);
    } else {
      Alert.alert('Athlete Contact', `No phone number on file for ${lesson.athleteName}.`);
    }
  };

  const getTypeLabel = () => {
    switch (lesson.type) {
      case 'private':
        return 'Private Lesson';
      case 'group':
        return 'Group Clinic';
      case 'clinic':
        return 'Tennis Clinic';
      default:
        return 'Coaching Session';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{lesson.status}</Text>
              </View>
              <Text style={styles.typeTag}>
                {getTypeLabel()}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Athlete Name & Category */}
          <Text style={styles.athleteName}>{lesson.athleteName}</Text>
          <Text style={styles.category}>{lesson.category}</Text>

          {/* Details Section */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Calendar size={16} color={COLORS.montoyaRed} />
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>DATE</Text>
                <Text style={styles.detailValue}>{lesson.date}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Clock size={16} color={COLORS.montoyaRed} />
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>TIME SLOT</Text>
                <Text style={styles.detailValue}>{lesson.time}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MapPin size={16} color={COLORS.montoyaRed} />
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>LOCATION & COURT</Text>
                <Text style={styles.detailValue}>{lesson.location}</Text>
              </View>
            </View>

            {lesson.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.detailLabel}>COACH NOTES</Text>
                <Text style={styles.notesText}>{lesson.notes}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <SecondaryButton
              title="Contact Athlete"
              onPress={handleContact}
              icon={<Phone size={16} color={COLORS.textPrimary} />}
              style={{ flex: 1 }}
            />
            {onClockIn && (
              <PrimaryButton
                title="Clock In"
                onPress={() => {
                  onClose();
                  onClockIn(lesson);
                }}
                icon={<ShieldCheck size={16} color={COLORS.white} />}
                style={{ flex: 1, backgroundColor: COLORS.montoyaRed }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  badgeText: {
    fontSize: moderateFont(11),
    fontWeight: '700',
    color: '#991B1B',
  },
  typeTag: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  closeBtn: {
    padding: 4,
  },
  athleteName: {
    fontSize: moderateFont(22),
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  category: {
    fontSize: moderateFont(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  detailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: moderateFont(9),
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  detailValue: {
    fontSize: moderateFont(13),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notesBox: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesText: {
    fontSize: moderateFont(12),
    color: COLORS.textPrimary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
