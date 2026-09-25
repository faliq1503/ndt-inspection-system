import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Indication } from '../../types/index';

interface IndicationState {
  items: Indication[];
  selectedId: number | null;
}

const initialState: IndicationState = { items: [], selectedId: null };

const indicationSlice = createSlice({
  name: 'indication',
  initialState,
  reducers: {
    setIndications(state, action: PayloadAction<Indication[]>) {
      state.items = action.payload;
    },
    addLocalIndication(state, action: PayloadAction<Indication>) {
      state.items.push(action.payload);
    },
    selectIndication(state, action: PayloadAction<number | null>) {
      state.selectedId = action.payload;
    },
    clearIndications() {
      return initialState;
    },
  },
});

export const { setIndications, addLocalIndication, selectIndication, clearIndications } =
  indicationSlice.actions;
export default indicationSlice.reducer;
