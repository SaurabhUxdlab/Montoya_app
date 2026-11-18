import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../../types';

interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  unreadCount: 0,
  isLoading: false,
  isSending: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages(state, action: PayloadAction<ChatMessage[]>) {
      state.messages = action.payload;
      // In the Coach App, unread messages are incoming messages from the admin that haven't been marked read yet
      state.unreadCount = action.payload.filter(
        (m) => m.sender === 'admin' && m.status !== 'read'
      ).length;
      state.isLoading = false;
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setSending(state, action: PayloadAction<boolean>) {
      state.isSending = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
      state.isSending = false;
    },
    clearChat(state) {
      state.messages = [];
      state.unreadCount = 0;
      state.isLoading = false;
      state.isSending = false;
      state.error = null;
    },
  },
});

export const { setMessages, setLoading, setSending, setError, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
