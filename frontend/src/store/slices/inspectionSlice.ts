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
  lebarZonaA: string;
  /** false = belum diubah manual, boleh ditimpa saran otomatis dari Length */
  lebarZonaATouched: boolean;
  /** diisi untuk komponen berbentuk pad/sepatu: P dipakai langsung, Diameter diabaikan */
  panjangPManual: string;
  pakaiPManual: boolean;
}
interface InspectionState {
  form: InspectionForm;
  componentId: number | null;
  result: EvaluationResult | null;
}

const initialState: InspectionState = {
  form: {
    jenisBenda: '',
    diameterMm: '',
    panjangLMm: '',
    zona: '',
    inspector: '',
    standardId: '',
    lebarZonaA: '',
    lebarZonaATouched: false,
    panjangPManual: '',
    pakaiPManual: false,
  },
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
    /** Length berubah: isi saran lebar Zone A (10% × Length) HANYA kalau user belum pernah mengubahnya manual. */
    suggestLebarZonaA(state, action: PayloadAction<number>) {
      if (!state.form.lebarZonaATouched) {
        state.form.lebarZonaA = (Math.round(action.payload * 10) / 100).toString();
      }
    },
    setResult(state, action: PayloadAction<EvaluationResult | null>) {
      state.result = action.payload;
    },
    resetWorkspace() {
      return initialState;
    },
  },
});

export const { setForm, setComponentId, setResult, resetWorkspace, suggestLebarZonaA } = inspectionSlice.actions;
export default inspectionSlice.reducer;
