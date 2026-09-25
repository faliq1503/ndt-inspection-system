import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { EvaluationResult } from '../../types/index';

/**
 * inspectionSlice — state workspace New Inspection.
 * Hasil perhitungan (EvaluationResult) hanya diisi dari backend.
 */

interface InspectionForm {
  jenisBenda: string;
  diameterMm: string;
  panjangLMm: string;
  zona: string;
  inspector: string;
  standardId: number | '';
}

interface InspectionState {
  form: InspectionForm;
  componentId: number | null;
  result: EvaluationResult | null;
}

const initialState: InspectionState = {
  form: { jenisBenda: '', diameterMm: '', panjangLMm: '', zona: '', inspector: '', standardId: '' },
  componentId: null,
  result: null,
};

const inspectionSlice = createSlice({
  name: 'inspection',
  initialState,
  reducers: {
    setForm(state, action: PayloadAction<Partial<InspectionForm>>) {
      state.form = { ...state.form, ...action.payload };
    },
    setComponentId(state, action: PayloadAction<number | null>) {
      state.componentId = action.payload;
    },
    setResult(state, action: PayloadAction<EvaluationResult | null>) {
      state.result = action.payload;
    },
    resetWorkspace() {
      return initialState;
    },
  },
});

export const { setForm, setComponentId, setResult, resetWorkspace } = inspectionSlice.actions;
export default inspectionSlice.reducer;
