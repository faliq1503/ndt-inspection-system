import type { EvaluationStatus } from '../types/index';

/** Backend mengembalikan ACCEPT/REJECT; spec menampilkan ACC/REJECT. */
export function displayStatus(status: EvaluationStatus | string | null | undefined): string {
  if (status === 'ACCEPT') return 'ACC';
  if (status === 'REJECT') return 'REJECT';
  return '-';
}

/**
 * Tahan terhadap NULL dari database lama (baris evaluation_result yang
 * dibuat sebelum migrasi kolom per-zona berisi NULL).
 */
export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
