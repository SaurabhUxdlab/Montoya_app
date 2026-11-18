import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { QueuedOperation } from '../../types';

export type SyncStatus = 'Synced' | 'Syncing' | 'Pending Sync' | 'Offline';

interface OfflineSyncState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingQueue: QueuedOperation[];
  lastSyncedAt: string | null;
}

const initialState: OfflineSyncState = {
  isOnline: true,
  syncStatus: 'Synced',
  pendingQueue: [],
  lastSyncedAt: new Date().toISOString(),
};

const offlineSyncSlice = createSlice({
  name: 'offlineSync',
  initialState,
  reducers: {
    setOnlineStatus(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
      if (!action.payload) {
        state.syncStatus = 'Offline';
      } else if (state.pendingQueue.length > 0) {
        state.syncStatus = 'Pending Sync';
      } else {
        state.syncStatus = 'Synced';
      }
    },
    enqueueOperation(state, action: PayloadAction<QueuedOperation>) {
      state.pendingQueue.push(action.payload);
      if (!state.isOnline) {
        state.syncStatus = 'Offline';
      } else {
        state.syncStatus = 'Pending Sync';
      }
    },
    removeQueuedOperation(state, action: PayloadAction<string>) {
      state.pendingQueue = state.pendingQueue.filter(
        (op) => op.operationId !== action.payload
      );
      if (state.pendingQueue.length === 0) {
        state.syncStatus = state.isOnline ? 'Synced' : 'Offline';
        state.lastSyncedAt = new Date().toISOString();
      }
    },
    setSyncStatus(state, action: PayloadAction<SyncStatus>) {
      state.syncStatus = action.payload;
    },
  },
});

export const {
  setOnlineStatus,
  enqueueOperation,
  removeQueuedOperation,
  setSyncStatus,
} = offlineSyncSlice.actions;

export default offlineSyncSlice.reducer;
