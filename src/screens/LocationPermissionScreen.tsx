import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin, X } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { PrimaryButton } from '../components/PrimaryButton';

import { useAppDispatch } from '../hooks/redux';
import { updateLocation } from '../store/slices/attendanceSlice';

interface LocationPermissionScreenProps {
  onPermissionGranted: () => void;
  onCancel: () => void;
}

export const LocationPermissionScreen: React.FC<LocationPermissionScreenProps> = ({
  onPermissionGranted,
  onCancel,
}) => {
  const dispatch = useAppDispatch();

  const handleRequestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        dispatch(
          updateLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? 5,
            altitude: position.coords.altitude ?? undefined,
          })
        );
        onPermissionGranted();
      } else {
        onCancel();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      onCancel();
    }
  };

  // Mock location for the map preview matching design
  const initialRegion = {
    latitude: 33.7490,
    longitude: -84.3880,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  const mapStyle = [
    {
      "elementType": "geometry",
      "stylers": [{"color": "#f5f5f5"}]
    },
    {
      "elementType": "labels.icon",
      "stylers": [{"visibility": "off"}]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#616161"}]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{"color": "#f5f5f5"}]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#bdbdbd"}]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [{"color": "#eeeeee"}]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#757575"}]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry",
      "stylers": [{"color": "#e5e5e5"}]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{"color": "#ffffff"}]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{"color": "#c9c9c9"}]
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <X size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <View style={styles.locationCircle}>
            <MapPin size={32} color={COLORS.montoyaRed} fill={COLORS.montoyaRed} />
          </View>
        </View>

        <Text style={styles.title}>Allow Location Access</Text>

        <Text style={styles.description}>
          Montoya Tennis uses your location to verify that you're at the correct venue when you check in and out. This helps accurately record your working hours.
        </Text>

        {/* Interactive Map Component */}
        <View style={styles.mapWrapper}>
           <MapView
             provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
             style={styles.map}
             initialRegion={initialRegion}
             scrollEnabled={true}
             zoomEnabled={true}
             rotateEnabled={true}
             pitchEnabled={true}
             customMapStyle={mapStyle}
           >
             <Marker coordinate={initialRegion}>
               <View style={styles.markerContainer}>
                 <View style={styles.bluePin}>
                    <View style={styles.bluePinInner} />
                 </View>
               </View>
             </Marker>
             <Circle
               center={initialRegion}
               radius={250}
               fillColor="rgba(123, 8, 24, 0.08)"
               strokeColor="rgba(123, 8, 24, 0.2)"
               strokeWidth={1}
             />
           </MapView>
        </View>

        <PrimaryButton
          title="Allow Location Access"
          onPress={handleRequestPermission}
          style={styles.actionBtn}
          textStyle={styles.actionBtnText}
        />

        <TouchableOpacity onPress={onCancel} style={styles.notNowBtn}>
          <Text style={styles.notNowText}>Not Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.accent,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 10,
    padding: 4,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  locationCircle: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: RADIUS.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: moderateFont(22),
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: moderateFont(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: SPACING.xl,
    paddingHorizontal: 4,
  },
  mapWrapper: {
    width: '100%',
    height: moderateScale(200),
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bluePin: {
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.card,
  },
  bluePinInner: {
    width: moderateScale(4),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: COLORS.white,
    position: 'absolute',
    top: '30%',
    left: '30%',
  },
  actionBtn: {
    width: '100%',
    backgroundColor: COLORS.montoyaRed,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    marginBottom: SPACING.md,
  },
  actionBtnText: {
    textTransform: 'none',
    fontSize: moderateFont(15),
    fontWeight: '700',
  },
  notNowBtn: {
    paddingVertical: SPACING.sm,
  },
  notNowText: {
    fontSize: moderateFont(14),
    fontWeight: '700',
    color: COLORS.montoyaRed,
  },
});
