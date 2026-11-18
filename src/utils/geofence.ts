import { GeofenceStatus } from '../types';

/**
 * Calculates distance between two GPS points in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Converts meters to miles string (e.g. 1287m -> "0.8 mi away")
 */
export function formatDistanceMiles(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft away`;
  }
  return `${miles.toFixed(1)} mi away`;
}

/**
 * Evaluates whether location is inside geofence radius
 */
export function evaluateGeofenceStatus(
  distanceMeters: number,
  allowedRadiusMeters: number
): GeofenceStatus {
  if (distanceMeters <= allowedRadiusMeters) {
    return 'On-Site';
  } else if (distanceMeters <= allowedRadiusMeters * 1.5) {
    return 'Boundary Warning';
  } else {
    return 'Off-Site';
  }
}
