import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DispatchProtocol } from '../../types';
import { INITIAL_DISPATCH_PROTOCOLS } from '../../services/seedData';

interface CourtOption {
  id: string;
  name: string;
  type: string;
  checked: boolean;
}

interface DispatchState {
  protocols: string[];
  instructors: string[];
  selectedProtocol: string;
  selectedInstructor: string;
  courtOptions: CourtOption[];
  specificDirectives: string;
  activeProtocols: DispatchProtocol[];
  isLoading: boolean;
  error: string | null;
}

const defaultCourts: CourtOption[] = [
  { id: 'c1', name: 'Courts 1-4', type: 'Hard', checked: true },
  { id: 'c2', name: 'Courts 5-8', type: 'Clay', checked: true },
  { id: 'c3', name: 'Indoor Facility', type: 'Indoor', checked: false },
  { id: 'c4', name: 'Fitness Center', type: 'Gym', checked: false },
];

const initialState: DispatchState = {
  protocols: [
    'Morning High-Intensity Drills',
    'Elite Junior Squad Training',
    'Pro Qualifying Prep',
    'Afternoon Match Play',
  ],
  instructors: [
    'Elena Montoya (Head Coach)',
    'Coach Silva',
    'Coach Marcus',
    'Coach Taylor',
  ],
  selectedProtocol: 'Morning High-Intensity Drills',
  selectedInstructor: 'Elena Montoya (Head Coach)',
  courtOptions: defaultCourts,
  specificDirectives: 'Maintain 80%+ cross-court rally consistency. Rotate courts every 45 minutes.',
  activeProtocols: INITIAL_DISPATCH_PROTOCOLS,
  isLoading: false,
  error: null,
};

const dispatchSlice = createSlice({
  name: 'dispatch',
  initialState,
  reducers: {
    setSelectedProtocol(state, action: PayloadAction<string>) {
      state.selectedProtocol = action.payload;
    },
    setSelectedInstructor(state, action: PayloadAction<string>) {
      state.selectedInstructor = action.payload;
    },
    toggleCourtOption(state, action: PayloadAction<string>) {
      const target = state.courtOptions.find((c) => c.id === action.payload);
      if (target) {
        target.checked = !target.checked;
      }
    },
    setDirectives(state, action: PayloadAction<string>) {
      state.specificDirectives = action.payload;
    },
    authorizeDispatchSuccess(state, action: PayloadAction<DispatchProtocol>) {
      state.activeProtocols.unshift(action.payload);
      state.isLoading = false;
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
  setSelectedProtocol,
  setSelectedInstructor,
  toggleCourtOption,
  setDirectives,
  authorizeDispatchSuccess,
  setLoading,
  setError,
} = dispatchSlice.actions;

export default dispatchSlice.reducer;
