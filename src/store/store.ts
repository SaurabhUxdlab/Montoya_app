import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import attendanceReducer from './slices/attendanceSlice';
import sessionReducer from './slices/sessionSlice';
import scheduleReducer from './slices/scheduleSlice';
import dispatchReducer from './slices/dispatchSlice';
import notificationReducer from './slices/notificationSlice';
import offlineSyncReducer from './slices/offlineSyncSlice';
import hoursReducer from './slices/hoursSlice';
import availabilityReducer from './slices/availabilitySlice';
import chatReducer from './slices/chatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance: attendanceReducer,
    session: sessionReducer,
    schedule: scheduleReducer,
    dispatch: dispatchReducer,
    notification: notificationReducer,
    offlineSync: offlineSyncReducer,
    hours: hoursReducer,
    availability: availabilityReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
