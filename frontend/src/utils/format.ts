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

/**
 * Tanggal dari SQLite CURRENT_TIMESTAMP berupa UTC tanpa penanda zona
 * ("2026-10-13 12:37:00"), jadi harus dibaca sebagai UTC.
 */
export function parseDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const d = new Date(hasZone ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "15 Okt 2026" (tanpa jam), '-' bila kosong. */
export function formatShortDate(value: string | null | undefined): string {
  const d = parseDbDate(value);
  if (!d) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Persentase di luar 0-100 tidak masuk akal (data lama / input dimensi keliru). */
export function isPercentAbnormal(value: number | null | undefined): boolean {
  return typeof value === 'number' && !Number.isNaN(value) && (value < 0 || value > 100);
}
