import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AlertTriangle, MapPin, CheckCircle2, ShieldCheck, X, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useLocationTracker } from '../hooks/useLocationTracker';
import {
  clockInSuccess,
  clockOutSuccess,
  addOverrideRequest,
  setOverrideModalVisible,
  setActiveFacility,
} from '../store/slices/attendanceSlice';
import { enqueueOperation } from '../store/slices/offlineSyncSlice';
import {
  performCoachCheckIn,
  performCoachCheckOut,
} from '../services/attendanceService';
import { SectionCard } from '../components/SectionCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { StatusBadge } from '../components/StatusBadge';
import { MapViewComponent } from '../components/MapViewComponent';
import { AttendanceTimeline } from '../components/AttendanceTimeline';
import { formatDistanceMiles } from '../utils/geofence';
import { moderateScale, moderateFont } from '../utils/responsive';

export const CheckInScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isFetching, refetchLocation } = useLocationTracker();
  const {
    activeFacility,
    facilities,
    currentLocation,
    distanceFromVenue,
    geofenceStatus,
    clockedIn,
    activeAttendance,
    attendanceHistory,
    overrides,
    isOverrideModalVisible,
    isLoading,
  } = useAppSelector((state) => state.attendance);

  const { assignedLessons, nextSession } = useAppSelector((state) => state.schedule);
  const { isOnline } = useAppSelector((state) => state.offlineSync);
  const user = useAppSelector((state) => state.auth.user);

  const [overrideReason, setOverrideReason] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<'Summer' | 'Winter'>('Summer');

  const isOffSite = geofenceStatus === 'Off-Site';
  const distanceStr = formatDistanceMiles(distanceFromVenue);

  const handleClockIn = async () => {
    if (isOffSite) {
      dispatch(setOverrideModalVisible(true));
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No authenticated coach profile found.');
      return;
    }

    const targetSession = assignedLessons && assignedLessons.length > 0 ? assignedLessons[0] : null;
    if (!targetSession) {
      Alert.alert('No Assigned Session', 'You do not have an assigned session to check into.');
      return;
    }

    try {
      const record = await performCoachCheckIn({
        coach: user,
        session: targetSession,
        venue: activeFacility,
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
          capturedAt: new Date().toISOString(),
        },
        distanceMeters: distanceFromVenue,
      });

      dispatch(clockInSuccess(record));
      Alert.alert('Check-In Successful', `Verified on-site at ${activeFacility.name}`);
    } catch (err: any) {
      console.error('[CheckInScreen] Clock in error:', err);
      Alert.alert('Check-In Error', err?.message || 'Failed to complete check-in.');
    }
  };

  const handleClockOut = async () => {
    const timestamp = new Date().toISOString();

    if (activeAttendance?.attendanceId) {
      try {
        await performCoachCheckOut({
          attendanceId: activeAttendance.attendanceId,
          coach: user || undefined,
          location: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy,
            capturedAt: timestamp,
          },
        });
      } catch (err: any) {
        console.error('[CheckInScreen] Clock out error:', err);
      }
    }

    dispatch(clockOutSuccess(timestamp));
    Alert.alert('Clocked Out', 'Your attendance shift session has been completed.');
  };


  const handleSubmitOverride = () => {
    if (!overrideReason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason for the override request.');
      return;
    }

    const timestamp = new Date().toISOString();
    const overrideDoc = {
      overrideId: `ovr_${Date.now()}`,
      coachId: user?.uid || '',
      attendanceId: `att_${Date.now()}`,
      reason: overrideReason.trim(),
      location: activeFacility.address,
      status: 'Pending' as const,
      requestedAt: timestamp,
    };

    if (!isOnline) {
      dispatch(
        enqueueOperation({
          operationId: `op_${Date.now()}`,
          operationType: 'requestOverride',
          payload: overrideDoc,
          createdAt: timestamp,
          retryCount: 0,
          status: 'pending',
        })
      );
    }

    dispatch(addOverrideRequest(overrideDoc));
    setOverrideReason('');
    Alert.alert(
      'Override Submitted',
      'Your remote clock-in request has been sent to Manager Sarah Jenkins for review.'
    );
  };

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.contentContainer}>
      {/* Seasonal Facility Selector Pill */}
      <View style={styles.seasonSelectorRow}>
        <Text style={styles.seasonLabel}>SEASON FACILITY:</Text>
        <TouchableOpacity
          style={[styles.seasonPill, selectedSeason === 'Summer' && styles.seasonPillActive]}
          onPress={() => {
            setSelectedSeason('Summer');
            const fac = facilities.find(f => f.season === 'Summer');
            if (fac) dispatch(setActiveFacility(fac));
          }}
        >
          <Text style={[styles.seasonPillText, selectedSeason === 'Summer' && styles.seasonPillTextActive]}>
            Summer (Outdoor)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.seasonPill, selectedSeason === 'Winter' && styles.seasonPillActive]}
          onPress={() => {
            setSelectedSeason('Winter');
            const fac = facilities.find(f => f.season === 'Winter');
            if (fac) dispatch(setActiveFacility(fac));
          }}
        >
          <Text style={[styles.seasonPillText, selectedSeason === 'Winter' && styles.seasonPillTextActive]}>
            Winter (Indoor)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Alert Card / Geofence Status Card matching Montoya Reference */}
      <SectionCard style={styles.alertCard}>
        <View style={styles.alertHeaderRow}>
          <View style={styles.alertTitleGroup}>
            <AlertTriangle size={18} color={COLORS.primary} />
            <Text style={styles.alertTitle}>
              {isOffSite ? 'Off-Site Alert' : 'On-Site Verified'}
            </Text>
          </View>

          <StatusBadge
            label={isOffSite ? 'Action Req' : 'Verified'}
            type={isOffSite ? 'action' : 'success'}
          />
        </View>

        <Text style={styles.alertMessage}>
          {isOffSite
            ? 'You are currently outside the geofence perimeter.'
            : 'You are inside the permitted facility geofence area.'}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>CURRENT LOCATION</Text>
            <Text style={styles.locationAddress}>{activeFacility.address}</Text>
          </View>
          <View style={styles.distanceCol}>
            <Text style={styles.distanceText}>{distanceStr}</Text>
          </View>
        </View>

        {/* GPS Accuracy Meter */}
        <View style={styles.gpsRow}>
          <Text style={styles.infoLabel}>GPS ACCURACY</Text>
          <View style={styles.gpsBarWrapper}>
            <View style={styles.gpsBarFilled} />
          </View>
          <Text style={styles.gpsText}>High</Text>
          <TouchableOpacity onPress={refetchLocation} disabled={isFetching} style={{ marginLeft: 4 }}>
            <RefreshCw size={14} color="#0EA5E9" />
          </TouchableOpacity>
        </View>

        {/* Clock In / Clock Out CTA Button */}
        {clockedIn ? (
          <PrimaryButton
            title="CLOCK OUT SESSION"
            onPress={handleClockOut}
            icon={<ShieldCheck size={18} color={COLORS.white} />}
            style={styles.clockButton}
          />
        ) : (
          <PrimaryButton
            title={isOffSite ? 'REQUEST OVERRIDE & CLOCK IN' : 'CLOCK IN'}
            onPress={handleClockIn}
            icon={<MapPin size={18} color={COLORS.white} />}
            style={styles.clockButton}
          />
        )}
      </SectionCard>

      {/* Map Component overlay */}
      <MapViewComponent
        latitude={currentLocation.latitude}
        longitude={currentLocation.longitude}
        facilityLatitude={activeFacility.latitude}
        facilityLongitude={activeFacility.longitude}
        geofenceRadius={activeFacility.geofenceRadius}
        facilityName={activeFacility.name}
        geofenceStatus={geofenceStatus}
      />

      {/* Activity Log Timeline */}
      <AttendanceTimeline history={attendanceHistory} overrides={overrides} />

      {/* Request Override Modal */}
      <Modal
        visible={isOverrideModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => dispatch(setOverrideModalVisible(false))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Attendance Override</Text>
              <TouchableOpacity
                onPress={() => dispatch(setOverrideModalVisible(false))}
                style={styles.closeBtn}
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              You are currently {distanceStr} from {activeFacility.name}. Provide a reason for requesting a remote clock-in.
            </Text>

            <Text style={styles.inputLabel}>REASON FOR OVERRIDE</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Traffic delayed arrival, pre-authorized remote meeting..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              value={overrideReason}
              onChangeText={setOverrideReason}
            />

            <View style={styles.modalActions}>
              <SecondaryButton
                title="CANCEL"
                onPress={() => dispatch(setOverrideModalVisible(false))}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="SUBMIT REQUEST"
                onPress={handleSubmitOverride}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: moderateScale(40),
  },
  seasonSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: moderateScale(6),
  },
  seasonLabel: {
    fontSize: moderateFont(10),
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  seasonPill: {
    backgroundColor: COLORS.grayBackground,
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: RADIUS.xs,
  },
  seasonPillActive: {
    backgroundColor: COLORS.primary,
  },
  seasonPillText: {
    fontSize: moderateFont(10),
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  seasonPillTextActive: {
    color: COLORS.white,
  },
  alertCard: {
    borderLeftWidth: moderateScale(4),
    borderLeftColor: COLORS.primary,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: moderateScale(6),
  },
  alertTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  alertTitle: {
    fontSize: moderateFont(16),
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  alertMessage: {
    fontSize: moderateFont(12),
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  infoCol: {
    flex: 1,
    marginRight: SPACING.md,
  },
  infoLabel: {
    fontSize: moderateFont(9),
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: moderateScale(2),
  },
  locationAddress: {
    fontSize: moderateFont(13),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  distanceCol: {
    alignItems: 'flex-end',
  },
  distanceText: {
    fontSize: moderateFont(13),
    fontWeight: '800',
    color: COLORS.primary,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    marginBottom: SPACING.lg,
  },
  gpsBarWrapper: {
    flex: 1,
    height: moderateScale(6),
    backgroundColor: COLORS.border,
    borderRadius: moderateScale(3),
    overflow: 'hidden',
  },
  gpsBarFilled: {
    height: '100%',
    width: '85%',
    backgroundColor: '#0EA5E9', // Cyan blue high accuracy
  },
  gpsText: {
    fontSize: moderateFont(11),
    fontWeight: '800',
    color: '#0EA5E9',
  },
  clockButton: {
    marginTop: moderateScale(4),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: moderateFont(16),
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: moderateScale(4),
  },
  modalSubtitle: {
    fontSize: moderateFont(12),
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: moderateFont(10),
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: moderateScale(6),
  },
  textArea: {
    backgroundColor: COLORS.grayBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xs,
    padding: SPACING.md,
    fontSize: moderateFont(13),
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    height: moderateScale(90),
    marginBottom: SPACING.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});

