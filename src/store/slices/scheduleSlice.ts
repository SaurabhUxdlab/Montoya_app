import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ScheduleItem, SubmissionItem, AssignedLesson } from '../../types';

type ScheduleViewMode = 'daily' | 'weekly' | 'monthly';

interface ScheduleState {
  viewMode: ScheduleViewMode;
  items: ScheduleItem[];
  nextSession: ScheduleItem | null;
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
  submissions: SubmissionItem[];
  assignedLessons: AssignedLesson[];
}

const initialState: ScheduleState = {
  viewMode: 'daily',
  items: [],
  nextSession: null,
  selectedDate: new Date().toISOString(),
  isLoading: false,
  error: null,
  submissions: [],
  assignedLessons: [],
};

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    setViewMode(state, action: PayloadAction<ScheduleViewMode>) {
      state.viewMode = action.payload;
    },
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
    },
    setScheduleData(
      state,
      action: PayloadAction<{
        items: ScheduleItem[];
        assignedLessons: AssignedLesson[];
        nextSession: ScheduleItem | null;
      }>
    ) {
      state.items = action.payload.items;
      state.assignedLessons = action.payload.assignedLessons;
      state.nextSession = action.payload.nextSession;
      state.isLoading = false;
      state.error = null;
    },
    setScheduleItems(state, action: PayloadAction<ScheduleItem[]>) {
      state.items = action.payload;
      if (action.payload.length > 0) {
        state.nextSession = action.payload[0];
      } else {
        state.nextSession = null;
      }
    },
    setAssignedLessons(state, action: PayloadAction<AssignedLesson[]>) {
      state.assignedLessons = action.payload;
    },
    addScheduleItem(state, action: PayloadAction<ScheduleItem>) {
      state.items.push(action.payload);
    },
    addAssignedLesson(state, action: PayloadAction<AssignedLesson>) {
      state.assignedLessons.unshift(action.payload);
    },
    updateLessonStatus(state, action: PayloadAction<{ id: string; status: AssignedLesson['status'] }>) {
      const item = state.assignedLessons.find((l) => l.id === action.payload.id);
      if (item) {
        item.status = action.payload.status;
      }
    },
    deleteAssignedLesson(state, action: PayloadAction<string>) {
      state.assignedLessons = state.assignedLessons.filter((l) => l.id !== action.payload);
    },
    clearSchedule(state) {
      state.items = [];
      state.assignedLessons = [];
      state.nextSession = null;
      state.submissions = [];
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
  },
});

export const {
  setViewMode,
  setSelectedDate,
  setScheduleData,
  setScheduleItems,
  setAssignedLessons,
  addScheduleItem,
  addAssignedLesson,
  updateLessonStatus,
  deleteAssignedLesson,
  clearSchedule,
  setLoading,
  setError,
} = scheduleSlice.actions;

export default scheduleSlice.reducer;
