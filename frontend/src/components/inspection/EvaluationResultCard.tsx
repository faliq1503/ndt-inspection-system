import type { EvaluationResult } from '../../types/index';
import StatusBadge, { Badge } from '../common/StatusBadge';

/** Kartu evaluasi akhir ACC/REJECT per zona + final (teks + ikon, spec §15). */
export default function EvaluationResultCard({
  result,
  size = 'md',
}: {
  result: EvaluationResult;
  /** lg: tampilan menonjol untuk halaman Inspeksi Baru. Default md. */
  size?: 'md' | 'lg';
}) {
  const ok = result.status === 'ACCEPT';

  if (size === 'lg') {
    return (
      <section
        className={`rounded-lg border p-4 ${
          ok ? 'border-ndt-success/40 bg-ndt-success/[0.06]' : 'border-ndt-danger/40 bg-ndt-danger/[0.06]'
        }`}
        aria-label="Hasil evaluasi"
      >
        <h3 className="text-[15px] font-semibold text-ndt-text">Hasil Evaluasi</h3>
        <div className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3">
          <Badge
            tone={ok ? 'success' : 'danger'}
            label={ok ? 'ACC' : 'REJECT'}
            icon={ok ? '✓' : '!'}
            title={result.status}
          />
          <span className={`text-xl font-bold ${ok ? 'text-ndt-success' : 'text-ndt-danger'}`}>
            {ok ? 'ACC' : 'REJECT'}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
            <span className="font-medium text-ndt-text">Zona A</span>
            <StatusBadge status={result.status_zone_a} />
          </div>
          <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
            <span className="font-medium text-ndt-text">Zona C</span>
            <StatusBadge status={result.status_zone_c} />
          </div>
        </div>
        <p
          className={`mt-2 flex items-start gap-1.5 text-[13px] font-medium ${
            ok ? 'text-ndt-success' : 'text-ndt-warning-dark'
          }`}
        >
          <span aria-hidden="true">{ok ? '✓' : '⚠'}</span>
          {ok
            ? 'Memenuhi kriteria penerimaan.'
            : 'Melebihi batas toleransi, status ditolak (REJECT).'}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-ndt-border bg-white p-4" aria-label="Hasil evaluasi">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Hasil Evaluasi</h3>
        <StatusBadge status={result.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center justify-between rounded-md bg-ndt-bg px-3 py-2">
          <span className="text-ndt-muted">Zona A</span>
          <StatusBadge status={result.status_zone_a} />
        </div>
        <div className="flex items-center justify-between rounded-md bg-ndt-bg px-3 py-2">
          <span className="text-ndt-muted">Zona C</span>
          <StatusBadge status={result.status_zone_c} />
        </div>
      </div>
      <p className="mt-2 text-xs text-ndt-muted">
        {result.status === 'ACCEPT'
          ? 'Memenuhi kriteria penerimaan.'
          : 'Melebihi batas toleransi, status ditolak (REJECT).'}
      </p>
    </section>
  );
}
