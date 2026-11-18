import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import {
  MapPin,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  ShieldCheck,
  Navigation,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { MapViewComponent } from './MapViewComponent';
import { calculateDistanceMeters } from '../utils/geofence';
import {
  AssignedSessionData,
  UNASSIGNED_VENUE,
  DEFAULT_ALLOWED_RADIUS_METERS,
  MAX_ACCEPTABLE_GPS_ACCURACY_METERS,
} from '../services/attendanceService';
import { Facility } from '../types';

interface LocationVerificationSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirmCheckIn: (locationData: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    capturedAt: string;
    distanceMeters: number;
  }) => Promise<void>;
  session: AssignedSessionData;
  venue?: Facility;
  isSubmitting?: boolean;
}

export const LocationVerificationSheet: React.FC<LocationVerificationSheetProps> = ({
  visible,
  onClose,
  onConfirmCheckIn,
  session,
  venue = UNASSIGNED_VENUE,
  isSubmitting = false,
}) => {
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    capturedAt: string;
  } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allowedRadius = venue.geofenceRadius || DEFAULT_ALLOWED_RADIUS_METERS;
  const hasVenueCoords = !!(venue.latitude && venue.latitude !== 0 && venue.longitude && venue.longitude !== 0);

  const fetchCurrentGps = async () => {
    setIsFetchingLocation(true);
    setErrorMessage(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setErrorMessage('Location permission is required to verify your check-in.');
        setIsFetchingLocation(false);
        return;
      }
      setPermissionDenied(false);

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy ?? 10;
      const altitude = pos.coords.altitude ?? undefined;
      const capturedAt = new Date().toISOString();

      const dist = hasVenueCoords
        ? calculateDistanceMeters(
            userLat,
            userLng,
            venue.latitude,
            venue.longitude
          )
        : 0;

      setGpsLocation({
        latitude: userLat,
        longitude: userLng,
        accuracy,
        altitude,
        capturedAt,
      });
      setDistanceMeters(dist);
    } catch (err: any) {
      console.error('[LocationVerificationSheet] GPS fetch error:', err);
      setErrorMessage(
        err?.message || 'Unable to detect your current location. Please check GPS.'
      );
    } finally {
      setIsFetchingLocation(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchCurrentGps();
    }
  }, [visible]);

  const isAccuracyGood =
    gpsLocation && gpsLocation.accuracy <= MAX_ACCEPTABLE_GPS_ACCURACY_METERS;
  const isWithinRadius =
    !hasVenueCoords || (distanceMeters !== null && distanceMeters <= allowedRadius);
  const isEligible = isWithinRadius && isAccuracyGood && !permissionDenied;

  const handleConfirm = async () => {
    if (!gpsLocation || distanceMeters === null) {
      Alert.alert('Location Required', 'Please wait for GPS location to be detected.');
      return;
    }

    if (!isEligible) {
      if (!isWithinRadius && hasVenueCoords) {
        Alert.alert(
          'Outside Venue Radius',
          `You are ${Math.round(distanceMeters)}m away from ${venue.name}. Check-in requires being within ${allowedRadius}m.`
        );
      } else if (!isAccuracyGood) {
        Alert.alert(
          'Low Accuracy',
          `GPS accuracy is ${Math.round(gpsLocation.accuracy)}m. Please tap "Try Again" to get a clearer GPS signal.`
        );
      }
      return;
    }

    await onConfirmCheckIn({
      ...gpsLocation,
      distanceMeters,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Check In</Text>
              <Text style={styles.sheetSubTitle}>Location Verification</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isSubmitting}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Today's Assignment Card */}
            <View style={styles.assignmentSection}>
              <View style={styles.sectionBadge}>
                <ShieldCheck size={14} color={COLORS.montoyaRed} />
                <Text style={styles.sectionBadgeText}>TODAY'S ASSIGNMENT</Text>
              </View>

              <View style={styles.assignmentCard}>
                <View style={styles.assignmentHeaderRow}>
                  <Text style={styles.assignmentTitle}>{session.title}</Text>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>
                      {session.startTimeText} - {session.endTimeText}
                    </Text>
                  </View>
                </View>

                {session.athleteName && (
                  <View style={styles.assignmentDetailRow}>
                    <User size={14} color={COLORS.textSecondary} />
                    <Text style={styles.assignmentDetailText}>
                      Player: <Text style={styles.boldText}>{session.athleteName}</Text>
                    </Text>
                  </View>
                )}

                <View style={styles.assignmentDetailRow}>
                  <MapPin size={14} color={COLORS.textSecondary} />
                  <Text style={styles.assignmentDetailText}>
                    Venue: <Text style={styles.boldText}>{venue.name}</Text> ({session.courtName || 'Court 1'})
                  </Text>
                </View>
              </View>
            </View>

            {/* Current Location Map */}
            <View style={styles.locationSection}>
              <View style={styles.locationHeaderRow}>
                <Text style={styles.locationSectionTitle}>Your Current Location</Text>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={fetchCurrentGps}
                  disabled={isFetchingLocation || isSubmitting}
                >
                  <RefreshCw
                    size={14}
                    color={COLORS.montoyaRed}
                    style={isFetchingLocation ? styles.spinIcon : undefined}
                  />
                  <Text style={styles.refreshBtnText}>
                    {isFetchingLocation ? 'Locating...' : 'Refresh GPS'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Map Preview */}
              <MapViewComponent
                latitude={gpsLocation?.latitude || venue.latitude}
                longitude={gpsLocation?.longitude || venue.longitude}
                facilityLatitude={venue.latitude}
                facilityLongitude={venue.longitude}
                geofenceRadius={allowedRadius}
                facilityName={venue.name}
                geofenceStatus={isWithinRadius ? 'On-Site' : 'Off-Site'}
              />

              {/* Location Diagnostics / Status Card */}
              {isFetchingLocation ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={COLORS.montoyaRed} />
                  <Text style={styles.loadingText}>Detecting device GPS location...</Text>
                </View>
              ) : errorMessage ? (
                <View style={styles.errorBox}>
                  <AlertTriangle size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : gpsLocation && distanceMeters !== null ? (
                <View
                  style={[
                    styles.statusCard,
                    isEligible ? styles.statusCardSuccess : styles.statusCardWarning,
                  ]}
                >
                  <View style={styles.statusHeaderRow}>
                    {isEligible ? (
                      <>
                        <CheckCircle2 size={18} color="#16A34A" />
                        <Text style={styles.statusTitleSuccess}>
                          You are at the assigned venue
                        </Text>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} color="#DC2626" />
                        <Text style={styles.statusTitleWarning}>
                          {!isWithinRadius
                            ? 'You are too far from the assigned venue'
                            : 'Location accuracy is too low'}
                        </Text>
                      </>
                    )}
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>DISTANCE FROM VENUE</Text>
                      <Text
                        style={[
                          styles.statValue,
                          isWithinRadius ? styles.textGreen : styles.textRed,
                        ]}
                      >
                        {hasVenueCoords ? `${Math.round(distanceMeters)} m` : 'On-Site'}
                      </Text>
                      <Text style={styles.statSub}>
                        {hasVenueCoords ? `Allowed: within ${allowedRadius} m` : 'GPS Verified'}
                      </Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>LOCATION ACCURACY</Text>
                      <Text
                        style={[
                          styles.statValue,
                          isAccuracyGood ? styles.textGreen : styles.textOrange,
                        ]}
                      >
                        {Math.round(gpsLocation.accuracy)} m
                      </Text>
                      <Text style={styles.statSub}>
                        {isAccuracyGood ? 'Strong Signal' : 'Signal Weak'}
                      </Text>
                    </View>
                  </View>

                  {isEligible ? (
                    <Text style={styles.statusSummaryNote}>
                      Location verified. Tap below to record your check-in.
                    </Text>
                  ) : (
                    <Text style={styles.statusWarningNote}>
                      {!isWithinRadius && hasVenueCoords
                        ? `Please approach ${venue.name} (within ${allowedRadius}m) to check in.`
                        : 'Please wait a moment for GPS to calibrate and tap Refresh GPS.'}
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !isEligible || isSubmitting ? styles.buttonDisabled : styles.buttonActive,
              ]}
              onPress={handleConfirm}
              disabled={!isEligible || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>
                    {isEligible ? 'Confirm Check In' : 'Check In (Outside Radius)'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!isEligible && (
              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={fetchCurrentGps}
                disabled={isFetchingLocation || isSubmitting}
              >
                <Text style={styles.tryAgainButtonText}>Try Again / Refresh GPS</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
    paddingBottom: 24,
    ...SHADOWS.accent,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8E8',
  },
  sheetTitle: {
    fontSize: moderateFont(20),
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  sheetSubTitle: {
    fontSize: moderateFont(12),
    fontWeight: '600',
    color: COLORS.montoyaRed,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  assignmentSection: {
    gap: 8,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionBadgeText: {
    fontSize: moderateFont(11),
    fontWeight: '800',
    color: COLORS.montoyaRed,
    letterSpacing: 0.6,
  },
  assignmentCard: {
    backgroundColor: '#FFF9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 14,
    gap: 8,
  },
  assignmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentTitle: {
    fontSize: moderateFont(16),
    fontWeight: '800',
    color: '#1E293B',
  },
  timeBadge: {
    backgroundColor: '#7B0818',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateFont(11),
    fontWeight: '700',
  },
  assignmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assignmentDetailText: {
    fontSize: moderateFont(13),
    color: '#475569',
  },
  boldText: {
    fontWeight: '700',
    color: '#1E293B',
  },
  locationSection: {
    gap: 10,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationSectionTitle: {
    fontSize: moderateFont(14),
    fontWeight: '800',
    color: '#1E293B',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FFF1F2',
  },
  refreshBtnText: {
    fontSize: moderateFont(11),
    fontWeight: '700',
    color: COLORS.montoyaRed,
  },
  spinIcon: {
    transform: [{ rotate: '45deg' }],
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    fontSize: moderateFont(12),
    color: '#64748B',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    fontSize: moderateFont(12),
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  statusCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  statusCardSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusCardWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitleSuccess: {
    fontSize: moderateFont(14),
    fontWeight: '800',
    color: '#15803D',
  },
  statusTitleWarning: {
    fontSize: moderateFont(14),
    fontWeight: '800',
    color: '#B91C1C',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCol: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: moderateFont(9),
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: moderateFont(16),
    fontWeight: '800',
    marginTop: 2,
  },
  statSub: {
    fontSize: moderateFont(10),
    color: '#94A3B8',
    marginTop: 1,
  },
  textGreen: {
    color: '#16A34A',
  },
  textRed: {
    color: '#DC2626',
  },
  textOrange: {
    color: '#D97706',
  },
  statusSummaryNote: {
    fontSize: moderateFont(12),
    color: '#166534',
    fontWeight: '600',
  },
  statusWarningNote: {
    fontSize: moderateFont(12),
    color: '#991B1B',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    ...SHADOWS.card,
  },
  buttonActive: {
    backgroundColor: '#16A34A', // Success green for confirmed location
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: moderateFont(15),
    fontWeight: '800',
  },
  tryAgainButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  tryAgainButtonText: {
    color: COLORS.montoyaRed,
    fontSize: moderateFont(13),
    fontWeight: '700',
  },
});
