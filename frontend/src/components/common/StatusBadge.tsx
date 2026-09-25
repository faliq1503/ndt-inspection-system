import type { EvaluationStatus } from '../../types/index';
import { displayStatus } from '../../utils/format';

/**
 * Badge status memakai teks + warna (jangan warna saja, spec §15).
 * Backend "ACCEPT" ditampilkan sebagai "ACC" sesuai spec.
 */
export default function StatusBadge({ status }: { status: EvaluationStatus | null | undefined }) {
  if (status !== 'ACCEPT' && status !== 'REJECT') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#64748B]/10 px-2.5 py-0.5 text-xs font-bold text-[#64748B]">
        -
      </span>
    );
  }
  const ok = status === 'ACCEPT';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        ok ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#DC2626]/10 text-[#DC2626]'
      }`}
      title={status}
    >
      <span aria-hidden>{ok ? '✓' : '!'}</span>
      {displayStatus(status)}
    </span>
  );
}
