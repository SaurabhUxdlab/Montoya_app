import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CoachAvailabilityRecord } from '../../types';

interface AvailabilityState {
  records: CoachAvailabilityRecord[];
  isLoading: boolean;
  error: string | null;
  statusFilter: 'All' | 'Approved' | 'Submitted' | 'Rejected';
}

const initialState: AvailabilityState = {
  records: [],
  isLoading: false,
  error: null,
  statusFilter: 'All',
};

const availabilitySlice = createSlice({
  name: 'availability',
  initialState,
  reducers: {
    setAvailabilityRecords(state, action: PayloadAction<CoachAvailabilityRecord[]>) {
      state.records = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    setStatusFilter(state, action: PayloadAction<'All' | 'Approved' | 'Submitted' | 'Rejected'>) {
      state.statusFilter = action.payload;
    },
    clearAvailability(state) {
      state.records = [];
      state.isLoading = false;
      state.error = null;
      state.statusFilter = 'All';
    },
  },
});

export const {
  setAvailabilityRecords,
  setLoading,
  setError,
  setStatusFilter,
  clearAvailability,
} = availabilitySlice.actions;

export default availabilitySlice.reducer;
