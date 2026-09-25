/**
 * types/index.ts
 *
 * Tipe frontend yang SELARAS dengan backend (source of truth).
 * Backend: backend/api/main.py, backend/core/models.py, backend/db/database.py
 *
 * Catatan audit:
 * - % Unbound dan status SELALU berasal dari POST /components/{id}/calculate.
 * - Status backend = "ACCEPT" | "REJECT" (bukan "ACC").
 * - Perhitungan dilakukan TERPISAH untuk Zone A dan Zone C (DOD-STD-2183 SH).
 */

export type Zone = 'A' | 'C';
export type EvaluationStatus = 'ACCEPT' | 'REJECT';

/** backend: tabel `standard` + StandardIn */
export interface Standard {
  id: number;
  nama_standard: string;
  lebar_zona_a_mm: number;
  toleransi_persen: number;
  individu_zona_a_mm: number;
  individu_zona_c_persen: number;
  individu_zona_c_max_mm2: number;
  keterangan: string;
}

/** backend: ComponentIn (POST /components) */
export interface ComponentCreate {
  jenis_benda: string;
  diameter_mm: number;
  panjang_l_mm: number;
  zona: string;
  standard_id: number;
}

/** backend: satu baris tabel `indication` */
export interface Indication {
  id: number;
  component_id: number;
  zona: Zone;
  panjang_mm: number;
  lebar_mm: number;
  /** posisi dalam persen 0-100 relatif terhadap gambar tampil */
  posisi_x: number | null;
  posisi_y: number | null;
}

/** backend: GET /components/{id} -> component + indikasi_list */
export interface ComponentDetail {
  id: number;
  jenis_benda: string;
  diameter_mm: number;
  panjang_l_mm: number;
  zona: string;
  standard_id: number;
  tanggal_input: string;
  gambar_path: string | null;
  indikasi_list: Indication[];
}

/**
 * backend: hasil POST /components/{id}/calculate (EvaluationResult).
 * Tidak ada field tunggal a_unbond_total / a_bond / persen_unbond.
 */
export interface EvaluationResult {
  component_id: number;
  p_keliling: number;
  a_babbit: number;
  a_zone_c: number;
  a_zone_a: number;
  a_unbond_zone_a: number;
  a_bond_zone_a: number;
  persen_unbond_zone_a: number;
  status_zone_a: EvaluationStatus;
  a_unbond_zone_c: number;
  a_bond_zone_c: number;
  persen_unbond_zone_c: number;
  status_zone_c: EvaluationStatus;
  status: EvaluationStatus;
}

/**
 * backend: GET /results -> evaluation_result JOIN component.
 * `id` = result id, `component_id` = id komponen (untuk mapping/detail).
 */
export interface ResultRow extends EvaluationResult {
  id: number;
  jenis_benda: string;
  diameter_mm: number;
  zona: string;
}

export interface AuthUser {
  username: string;
}
