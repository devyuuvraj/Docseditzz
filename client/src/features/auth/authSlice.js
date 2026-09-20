import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { setAccessToken } from '../../lib/axios.js';
import { runBootstrapSession } from './bootstrapSession.js';

/** Restore cookie session or create a new guest workspace (no login UI). */
export const bootstrapSession = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  try {
    return await runBootstrapSession();
  } catch (error) {
    const msg =
      error?.response?.data?.message || error?.message || 'Could not start workspace';
    return rejectWithValue({ message: msg });
  }
});

/** Clears the current cookie and starts a fresh guest workspace. */
export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
  return dispatch(bootstrapSession()).unwrap();
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    isBootstrapping: true,
    bootstrapError: null,
  },
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.isAuthenticated = true;
      setAccessToken(accessToken);
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      setAccessToken(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.pending, (state) => {
        state.isBootstrapping = true;
        state.bootstrapError = null;
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isBootstrapping = false;
        state.bootstrapError = null;
      })
      .addCase(bootstrapSession.rejected, (state, action) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isBootstrapping = false;
        state.bootstrapError = action.payload?.message || action.error?.message || null;
      })
      .addCase(logoutUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
      });
  },
});

export const { setCredentials, setUser, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
