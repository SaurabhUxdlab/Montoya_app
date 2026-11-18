import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Navigation, MapPin } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { GeofenceStatus } from '../types';
import { moderateScale } from '../utils/responsive';

interface MapViewComponentProps {
  latitude: number;
  longitude: number;
  facilityLatitude?: number;
  facilityLongitude?: number;
  geofenceRadius?: number;
  facilityName: string;
  geofenceStatus: GeofenceStatus;
}

export const MapViewComponent: React.FC<MapViewComponentProps> = ({
  latitude,
  longitude,
  facilityLatitude,
  facilityLongitude,
  geofenceRadius = 100,
  facilityName,
  geofenceStatus,
}) => {
  const mapRef = useRef<MapView>(null);
  const isOffSite = geofenceStatus === 'Off-Site';

  const userLat = latitude || 33.805;
  const userLng = longitude || -84.395;
  const hasFacCoords = !!(facilityLatitude && facilityLatitude !== 0 && facilityLongitude && facilityLongitude !== 0);
  const facLat = hasFacCoords ? (facilityLatitude as number) : userLat;
  const facLng = hasFacCoords ? (facilityLongitude as number) : userLng;

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: (userLat + facLat) / 2,
        longitude: (userLng + facLng) / 2,
        latitudeDelta: Math.max(Math.abs(userLat - facLat) * 2.5, 0.015),
        longitudeDelta: Math.max(Math.abs(userLng - facLng) * 2.5, 0.015),
      }, 500);
    }
  }, [userLat, userLng, facLat, facLng]);

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={{
          latitude: (userLat + facLat) / 2,
          longitude: (userLng + facLng) / 2,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        scrollEnabled={true}
        zoomEnabled={true}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* User Current Location Marker */}
        <Marker 
          coordinate={{ latitude: userLat, longitude: userLng }}
          title="Your Position"
          description={isOffSite ? 'Outside Geofence' : 'Inside Facility'}
        >
          <View style={styles.userMarker}>
            <View style={[styles.dot, isOffSite && styles.dotOffSite]} />
          </View>
        </Marker>

        {/* Facility Target Center Marker */}
        {hasFacCoords && (
          <>
            <Marker
              coordinate={{ latitude: facLat, longitude: facLng }}
              title={facilityName}
              description="Facility Target Location"
            >
              <View style={styles.facilityPin}>
                <MapPin size={16} color={COLORS.white} fill={COLORS.montoyaRed} />
              </View>
            </Marker>

            {/* Facility Geofence Circle */}
            <Circle
              center={{ latitude: facLat, longitude: facLng }}
              radius={geofenceRadius}
              fillColor="rgba(123, 8, 24, 0.15)"
              strokeColor={COLORS.montoyaRed}
              strokeWidth={2}
            />
          </>
        )}
      </MapView>

      {/* Target Zone Label Overlay */}
      <View style={styles.targetLabelBadge}>
        <Navigation size={12} color={COLORS.white} />
        <Text style={styles.targetLabelText}>Target Zone ({facilityName})</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    height: moderateScale(180),
    width: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  userMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  dotOffSite: {
    backgroundColor: COLORS.montoyaRed,
  },
  facilityPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.montoyaRed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  targetLabelBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: COLORS.montoyaRed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  targetLabelText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

