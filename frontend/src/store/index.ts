import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import inspectionReducer from './slices/inspectionSlice';
import indicationReducer from './slices/indicationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inspection: inspectionReducer,
    indication: indicationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
