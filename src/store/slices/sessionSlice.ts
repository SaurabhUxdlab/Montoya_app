import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Player,
  ActivityBlock,
  BillingAllocation,
  SessionLog,
  SessionType,
} from '../../types';
import { INITIAL_PLAYERS } from '../../services/seedData';

interface SessionState {
  sessionType: SessionType;
  startTime: string;
  endTime: string;
  selectedAthletes: Player[];
  availablePlayers: Player[];
  activityBlocks: ActivityBlock[];
  billingAllocations: BillingAllocation[];
  isAthleteModalOpen: boolean;
  logsHistory: SessionLog[];
  isLoading: boolean;
  error: string | null;
}

const defaultActivityBlocks: ActivityBlock[] = [
  {
    id: 'block_1',
    title: '01 WARM-UP & FOOTWORK',
    durationMinutes: 15,
    tags: ['AGILITY LADDER', 'DYNAMIC STRETCH'],
    notes: '',
  },
  {
    id: 'block_2',
    title: '02 BASELINE RALLIES (INTENSITY)',
    durationMinutes: 45,
    tags: ['FOREHAND DEPTH', 'HEAVY TOPSPIN'],
    intensity: 8,
    avgPaceMph: 125,
    consistencyPct: 84,
    notes: '',
  },
];

const initialState: SessionState = {
  sessionType: 'group',
  startTime: '02:00 PM',
  endTime: '04:00 PM',
  selectedAthletes: [INITIAL_PLAYERS[0], INITIAL_PLAYERS[1]], // A. Chen & J. Williams
  availablePlayers: INITIAL_PLAYERS,
  activityBlocks: defaultActivityBlocks,
  billingAllocations: [
    { playerId: INITIAL_PLAYERS[0].playerId, playerName: INITIAL_PLAYERS[0].name, percentage: 50 },
    { playerId: INITIAL_PLAYERS[1].playerId, playerName: INITIAL_PLAYERS[1].name, percentage: 50 },
  ],
  isAthleteModalOpen: false,
  logsHistory: [],
  isLoading: false,
  error: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSessionType(state, action: PayloadAction<SessionType>) {
      state.sessionType = action.payload;
    },
    setTimes(state, action: PayloadAction<{ startTime: string; endTime: string }>) {
      state.startTime = action.payload.startTime;
      state.endTime = action.payload.endTime;
    },
    toggleSelectAthlete(state, action: PayloadAction<Player>) {
      const exists = state.selectedAthletes.some((p) => p.playerId === action.payload.playerId);
      if (exists) {
        state.selectedAthletes = state.selectedAthletes.filter(
          (p) => p.playerId !== action.payload.playerId
        );
      } else {
        state.selectedAthletes.push(action.payload);
      }

      // Re-balance billing allocations evenly among selected players
      const count = state.selectedAthletes.length;
      if (count > 0) {
        const evenPct = Math.floor(100 / count);
        let rem = 100 - evenPct * count;
        state.billingAllocations = state.selectedAthletes.map((p, idx) => ({
          playerId: p.playerId,
          playerName: p.name,
          percentage: idx === 0 ? evenPct + rem : evenPct,
        }));
      } else {
        state.billingAllocations = [];
      }
    },
    updateBillingAllocation(state, action: PayloadAction<{ playerId: string; percentage: number }>) {
      const target = state.billingAllocations.find((b) => b.playerId === action.payload.playerId);
      if (target) {
        target.percentage = action.payload.percentage;
      }
    },
    addActivityBlock(state, action: PayloadAction<ActivityBlock>) {
      state.activityBlocks.push(action.payload);
    },
    updateActivityBlock(state, action: PayloadAction<{ id: string; updates: Partial<ActivityBlock> }>) {
      const block = state.activityBlocks.find((b) => b.id === action.payload.id);
      if (block) {
        Object.assign(block, action.payload.updates);
      }
    },
    deleteActivityBlock(state, action: PayloadAction<string>) {
      state.activityBlocks = state.activityBlocks.filter((b) => b.id !== action.payload);
    },
    setAthleteModalOpen(state, action: PayloadAction<boolean>) {
      state.isAthleteModalOpen = action.payload;
    },
    saveSessionSuccess(state, action: PayloadAction<SessionLog>) {
      state.logsHistory.unshift(action.payload);
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
  setSessionType,
  setTimes,
  toggleSelectAthlete,
  updateBillingAllocation,
  addActivityBlock,
  updateActivityBlock,
  deleteActivityBlock,
  setAthleteModalOpen,
  saveSessionSuccess,
  setLoading,
  setError,
} = sessionSlice.actions;

export default sessionSlice.reducer;
