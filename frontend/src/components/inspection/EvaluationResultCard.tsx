import type { EvaluationResult } from '../../types/index';
import StatusBadge from '../common/StatusBadge';

/** Kartu evaluasi akhir ACC/REJECT per zona + final (teks + ikon, spec §15). */
export default function EvaluationResultCard({ result }: { result: EvaluationResult }) {
  return (
    <section className="rounded-lg border border-[#E2E8F0] bg-white p-4" aria-label="Hasil evaluasi">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Evaluation Result</h3>
        <StatusBadge status={result.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center justify-between rounded-md bg-[#F5F7FA] px-3 py-2">
          <span className="text-[#64748B]">Zone A</span>
          <StatusBadge status={result.status_zone_a} />
        </div>
        <div className="flex items-center justify-between rounded-md bg-[#F5F7FA] px-3 py-2">
          <span className="text-[#64748B]">Zone C</span>
          <StatusBadge status={result.status_zone_c} />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#64748B]">
        {result.status === 'ACCEPT'
          ? 'Within Acceptance Criteria (backend: ACCEPT).'
          : 'Exceeds Acceptance Criteria (backend: REJECT).'}
      </p>
    </section>
  );
}
