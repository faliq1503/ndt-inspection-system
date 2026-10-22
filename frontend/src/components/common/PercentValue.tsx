import { formatNumber, isPercentAbnormal } from '../../utils/format';

/**
 * Nilai % unbond untuk tabel. Nilai di luar 0-100 % diberi tanda peringatan
 * supaya tidak terbaca sebagai hasil yang valid.
 */
export default function PercentValue({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-ndt-muted">-</span>;
  if (!isPercentAbnormal(value)) return <span className="tabular-nums">{formatNumber(value)} %</span>;
  return (
    <span
      className="inline-flex items-center gap-1 font-semibold tabular-nums text-ndt-warning-dark"
      title="Nilai tidak wajar (di luar 0-100 %). Periksa kembali dimensi dan data indikasi."
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {formatNumber(value)} %<span className="sr-only"> (nilai tidak wajar)</span>
    </span>
  );
}
