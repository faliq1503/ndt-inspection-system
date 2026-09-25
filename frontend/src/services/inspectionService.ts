/**
 * services/inspectionService.ts
 *
 * Pembungkus endpoint backend NDT yang ditemukan saat audit (Prompt 1).
 * backend/api/main.py adalah source of truth — daftar di bawah ini
 * HANYA berisi endpoint yang benar-benar ada, tanpa asumsi.
 */

import { API_URL, apiGet, apiPost, apiPut, apiUpload } from './api';
import type {
  ComponentCreate,
  ComponentDetail,
  EvaluationResult,
  Indication,
  ResultRow,
  Standard,
  Zone,
} from '../types/index';

interface IdResponse {
  id: number;
}

interface UploadImageResponse {
  gambar_path: string;
  url: string;
}

export const inspectionService = {
  // --- Standard -------------------------------------------------
  listStandards(): Promise<Standard[]> {
    return apiGet<Standard[]>('/standards');
  },

  // --- Component ------------------------------------------------
  createComponent(payload: ComponentCreate): Promise<IdResponse & ComponentCreate> {
    return apiPost<IdResponse & ComponentCreate>('/components', payload);
  },

  getComponent(componentId: number): Promise<ComponentDetail> {
    return apiGet<ComponentDetail>(`/components/${componentId}`);
  },

  uploadImage(componentId: number, file: File): Promise<UploadImageResponse> {
    return apiUpload<UploadImageResponse>(`/components/${componentId}/upload-image`, file);
  },

  imageUrl(gambarPath: string | null): string | null {
    if (!gambarPath) return null;
    if (/^https?:\/\//.test(gambarPath)) return gambarPath;
    const path = gambarPath.startsWith('/') ? gambarPath : `/images/${gambarPath}`;
    return `${API_URL}${path}`;
  },

  // --- Indication -----------------------------------------------
  addIndication(
    componentId: number,
    payload: { zona: Zone; panjang_mm: number; lebar_mm: number; posisi_x: number | null; posisi_y: number | null },
  ): Promise<IdResponse> {
    return apiPost<IdResponse>(`/components/${componentId}/indications`, payload);
  },

  updatePosition(indicationId: number, posisi_x: number, posisi_y: number): Promise<Indication> {
    return apiPut<Indication>(`/indications/${indicationId}/position`, { posisi_x, posisi_y });
  },

  updateSize(indicationId: number, zona: Zone, panjang_mm: number, lebar_mm: number): Promise<Indication> {
    return apiPut<Indication>(`/indications/${indicationId}/size`, { zona, panjang_mm, lebar_mm });
  },

  // --- Hitung & evaluasi (formula milik backend, bukan frontend) --
  calculate(componentId: number): Promise<EvaluationResult> {
    return apiPost<EvaluationResult>(`/components/${componentId}/calculate`);
  },

  // --- Riwayat & export ------------------------------------------
  listResults(): Promise<ResultRow[]> {
    return apiGet<ResultRow[]>('/results');
  },

  reportPdfUrl(resultId: number): string {
    return `${API_URL}/results/${resultId}/report/pdf`;
  },

  excelExportUrl(): string {
    return `${API_URL}/results/export/excel`;
  },
};
