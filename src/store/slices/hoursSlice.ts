import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HourBlock, HourBlockCategory } from '../../types';

interface HoursState {
  blocks: HourBlock[];
  totalLoggedTime: string;
  shiftDuration: string;
}

const initialState: HoursState = {
  blocks: [],
  totalLoggedTime: '0m',
  shiftDuration: 'No shifts today',
};

const hoursSlice = createSlice({
  name: 'hours',
  initialState,
  reducers: {
    setHourlyBlocks(
      state,
      action: PayloadAction<{
        blocks: HourBlock[];
        totalLoggedTime: string;
        shiftDuration: string;
      }>
    ) {
      state.blocks = action.payload.blocks;
      state.totalLoggedTime = action.payload.totalLoggedTime;
      state.shiftDuration = action.payload.shiftDuration;
    },
    updateBlockCategory(state, action: PayloadAction<{ id: string; category: HourBlockCategory }>) {
      const block = state.blocks.find(b => b.id === action.payload.id);
      if (block) {
        block.category = action.payload.category;
        block.isConfirmed = true;
      }
    },
  },
});

export const { setHourlyBlocks, updateBlockCategory } = hoursSlice.actions;
export default hoursSlice.reducer;
