import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { CoachAvailabilityRecord } from '../types';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { formatTime12h } from '../services/availabilityService';

interface DeleteAvailabilityModalProps {
  visible: boolean;
  item: CoachAvailabilityRecord | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteAvailabilityModal: React.FC<DeleteAvailabilityModalProps> = ({
  visible,
  item,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!item) return null;

  const timeRange = `${formatTime12h(item.startTime)} – ${formatTime12h(item.endTime)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.iconCircle}>
            <AlertTriangle size={28} color="#DC2626" />
          </View>

          <Text style={styles.title}>Delete Availability?</Text>
          <Text style={styles.description}>
            Are you sure you want to remove your availability for{' '}
            <Text style={styles.highlightText}>{item.date}</Text> ({timeRange}) at{' '}
            <Text style={styles.highlightText}>{item.venue || item.locationName}</Text>?
          </Text>

          <Text style={styles.warningNote}>
            This record will be permanently deleted from the database.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onConfirm}
              disabled={isDeleting}
              activeOpacity={0.8}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  iconCircle: {
    width: moderateScale(54),
    height: moderateScale(54),
    borderRadius: moderateScale(27),
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: moderateFont(18),
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  description: {
    fontSize: moderateFont(13),
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  highlightText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  warningNote: {
    fontSize: moderateFont(11),
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: moderateFont(14),
    fontWeight: '600',
    color: '#475569',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
