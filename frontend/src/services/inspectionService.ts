/**
 * services/inspectionService.ts
 *
 * Pembungkus endpoint backend NDT yang ditemukan saat audit (Prompt 1).
 * backend/api/main.py adalah source of truth — daftar di bawah ini
 * HANYA berisi endpoint yang benar-benar ada, tanpa asumsi.
 */

import { API_URL, apiDelete, apiDownload, apiGet, apiPost, apiPut, apiUpload } from './api';
import type {
  ComponentCreate,
  ComponentDetail,
  EvaluationResult,
  Indication,
  ResultRow,
  Standard,
  TandaTanganIsian,
  Zone,
} from '../types/index';

/** Nama tanda tangan untuk ekspor sebagai query string (kosong = diisi tangan). */
function ttdQuery(ttd?: TandaTanganIsian): string {
  return new URLSearchParams({ ttd_prepared: ttd?.prepared ?? '', ttd_approved: ttd?.approved ?? '' }).toString();
}

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
    payload: {
      zona: Zone;
      panjang_mm: number;
      lebar_mm: number;
      posisi_x: number | null;
      posisi_y: number | null;
      /** hanya saat mengembalikan indikasi lewat Ulangi */
      bukti_path?: string | null;
    },
  ): Promise<IdResponse> {
    return apiPost<IdResponse>(`/components/${componentId}/indications`, payload);
  },

  /** Hapus satu indikasi (dipakai Urungkan). Backend mengembalikan data yang dihapus. */
  deleteIndication(indicationId: number): Promise<Indication> {
    return apiDelete<Indication>(`/indications/${indicationId}`);
  },

  updatePosition(indicationId: number, posisi_x: number, posisi_y: number): Promise<Indication> {
    return apiPut<Indication>(`/indications/${indicationId}/position`, { posisi_x, posisi_y });
  },

  updateSize(indicationId: number, zona: Zone, panjang_mm: number, lebar_mm: number): Promise<Indication> {
    return apiPut<Indication>(`/indications/${indicationId}/size`, { zona, panjang_mm, lebar_mm });
  },

  /** Upload foto bukti pengukuran langsung. Backend: POST /indications/{id}/upload-bukti. */
  uploadBukti(indicationId: number, file: File): Promise<{ bukti_path: string; url: string }> {
    return apiUpload<{ bukti_path: string; url: string }>(`/indications/${indicationId}/upload-bukti`, file);
  },

  /**
   * Total seluruh indication dari semua inspection (jumlah baris,
   * bukan luas). Backend: GET /indications/count -> { total_indication }.
   */
  async totalIndications(): Promise<number> {
    const data = await apiGet<{ total_indication: number }>('/indications/count');
    return data.total_indication;
  },

  // --- Hitung & evaluasi (formula milik backend, bukan frontend) --
  calculate(componentId: number): Promise<EvaluationResult> {
    return apiPost<EvaluationResult>(`/components/${componentId}/calculate`);
  },

  // --- Riwayat & export ------------------------------------------
  listResults(): Promise<ResultRow[]> {
    return apiGet<ResultRow[]>('/results');
  },

  downloadReportPdf(resultId: number, nomor: number = resultId, ttd?: TandaTanganIsian): Promise<void> {
    return apiDownload(`/results/${resultId}/report/pdf?${ttdQuery(ttd)}`, `laporan_ndt_${nomor}.pdf`);
  },

  /** resultIds diisi = export hanya baris tersebut (sesuai filter di halaman Riwayat). */
  downloadExcel(resultIds?: number[], ttd?: TandaTanganIsian): Promise<void> {
    const query = new URLSearchParams(ttdQuery(ttd));
    if (resultIds) query.set('ids', resultIds.join(','));
    return apiDownload(`/results/export/excel?${query}`, 'riwayat_hasil_ndt.xlsx');
  },

  bulkDeleteResults(resultIds: number[]): Promise<{ deleted_components: number }> {
    return apiPost<{ deleted_components: number }>('/results/bulk-delete', { result_ids: resultIds });
  },

  reportPdfUrl(resultId: number): string {
    return `${API_URL}/results/${resultId}/report/pdf`;
  },

  excelExportUrl(): string {
    return `${API_URL}/results/export/excel`;
  },
};
