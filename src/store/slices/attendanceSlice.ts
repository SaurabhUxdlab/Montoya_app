import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Facility,
  AttendanceRecord,
  AttendanceOverride,
  GeofenceStatus,
} from '../../types';
import {
  INITIAL_FACILITIES,
} from '../../services/seedData';
import { calculateDistanceMeters, evaluateGeofenceStatus } from '../../utils/geofence';

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
}

interface AttendanceState {
  facilities: Facility[];
  activeFacility: Facility;
  currentLocation: LocationState;
  distanceFromVenue: number;
  geofenceStatus: GeofenceStatus;
  clockedIn: boolean;
  activeAttendance: AttendanceRecord | null;
  latestCompletedAttendance: AttendanceRecord | null;
  attendanceHistory: AttendanceRecord[];
  overrides: AttendanceOverride[];
  isOverrideModalVisible: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial position simulated near Peachtree St, slightly off-site (0.8 mi away) matching Montoya design
const defaultLoc = {
  latitude: 33.805,
  longitude: -84.395,
  accuracy: 4, // High accuracy
};

const defaultFacility = INITIAL_FACILITIES[0];
const initialDistance = calculateDistanceMeters(
  defaultLoc.latitude,
  defaultLoc.longitude,
  defaultFacility.latitude,
  defaultFacility.longitude
);

const initialState: AttendanceState = {
  facilities: INITIAL_FACILITIES,
  activeFacility: defaultFacility,
  currentLocation: defaultLoc,
  distanceFromVenue: initialDistance,
  geofenceStatus: evaluateGeofenceStatus(initialDistance, defaultFacility.geofenceRadius),
  clockedIn: false,
  activeAttendance: null,
  latestCompletedAttendance: null,
  attendanceHistory: [],
  overrides: [],
  isOverrideModalVisible: false,
  isLoading: false,
  error: null,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    updateLocation(state, action: PayloadAction<LocationState>) {
      state.currentLocation = action.payload;
      const distance = calculateDistanceMeters(
        action.payload.latitude,
        action.payload.longitude,
        state.activeFacility.latitude,
        state.activeFacility.longitude
      );
      state.distanceFromVenue = distance;
      state.geofenceStatus = evaluateGeofenceStatus(
        distance,
        state.activeFacility.geofenceRadius
      );
    },
    setActiveFacility(state, action: PayloadAction<Facility>) {
      state.activeFacility = action.payload;
      const distance = calculateDistanceMeters(
        state.currentLocation.latitude,
        state.currentLocation.longitude,
        action.payload.latitude,
        action.payload.longitude
      );
      state.distanceFromVenue = distance;
      state.geofenceStatus = evaluateGeofenceStatus(
        distance,
        action.payload.geofenceRadius
      );
    },
    setActiveAttendance(
      state,
      action: PayloadAction<
        | AttendanceRecord
        | null
        | { active: AttendanceRecord | null; latestCompleted?: AttendanceRecord | null }
      >
    ) {
      const payload: any = action.payload;
      const activeRecord: AttendanceRecord | null =
        payload && 'active' in payload ? payload.active : payload;
      const latestCompleted: AttendanceRecord | null | undefined =
        payload && 'latestCompleted' in payload
          ? payload.latestCompleted
          : undefined;

      state.activeAttendance = activeRecord || null;
      if (latestCompleted !== undefined) {
        state.latestCompletedAttendance = latestCompleted || null;
      }

      const record = activeRecord;
      if (!record) {
        state.clockedIn = false;
      } else {
        const s = (record.status || '').toLowerCase();
        const isCheckedOut =
          !!record.checkOutTime ||
          !!record.clockOutTime ||
          s.includes('complet') ||
          s.includes('cancel');
        const isCheckedIn =
          !isCheckedOut &&
          (s.includes('present') ||
            s.includes('check') ||
            s.includes('progress') ||
            s.includes('site') ||
            s.includes('active') ||
            s.includes('verified') ||
            !s);
        state.clockedIn = isCheckedIn;
      }
      state.isLoading = false;
    },
    setAttendanceHistory(state, action: PayloadAction<AttendanceRecord[]>) {
      state.attendanceHistory = action.payload;
    },
    clockInSuccess(state, action: PayloadAction<AttendanceRecord>) {
      state.clockedIn = true;
      state.activeAttendance = action.payload;
      state.attendanceHistory = [
        action.payload,
        ...state.attendanceHistory.filter(
          (h) => h.attendanceId !== action.payload.attendanceId
        ),
      ];
      state.isLoading = false;
    },
    clockOutSuccess(state, action: PayloadAction<string>) {
      state.clockedIn = false;
      if (state.activeAttendance) {
        const completed: AttendanceRecord = {
          ...state.activeAttendance,
          checkOutTime: action.payload,
          clockOutTime: action.payload,
          status: 'Completed',
        };
        state.latestCompletedAttendance = completed;
        state.attendanceHistory = [
          completed,
          ...state.attendanceHistory.filter(
            (h) => h.attendanceId !== completed.attendanceId
          ),
        ];
      }
      state.activeAttendance = null;
      state.isLoading = false;
    },
    addOverrideRequest(state, action: PayloadAction<AttendanceOverride>) {
      state.overrides.unshift(action.payload);
      // Also add pending item to history
      const newAttLog: AttendanceRecord = {
        attendanceId: action.payload.attendanceId || `att_${Date.now()}`,
        coachId: action.payload.coachId,
        academyId: 'montoya_academy_atlanta',
        venueId: state.activeFacility.facilityId,
        venueName: state.activeFacility.name,
        facilityId: state.activeFacility.facilityId,
        checkInTime: action.payload.requestedAt,
        clockInTime: action.payload.requestedAt,
        latitude: state.currentLocation.latitude,
        longitude: state.currentLocation.longitude,
        gpsAccuracy: state.currentLocation.accuracy,
        deviceTimestamp: action.payload.requestedAt,
        distanceFromVenue: state.distanceFromVenue,
        status: state.geofenceStatus,
        verificationStatus: 'Pending Override',
      };
      state.attendanceHistory.unshift(newAttLog);
      state.isOverrideModalVisible = false;
    },
    setOverrideModalVisible(state, action: PayloadAction<boolean>) {
      state.isOverrideModalVisible = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const {
  updateLocation,
  setActiveFacility,
  setActiveAttendance,
  setAttendanceHistory,
  clockInSuccess,
  clockOutSuccess,
  addOverrideRequest,
  setOverrideModalVisible,
  setLoading,
  setError,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;
