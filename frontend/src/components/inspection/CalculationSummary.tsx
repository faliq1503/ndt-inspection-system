import type { EvaluationResult, Standard } from '../../types/index';
import { formatNumber } from '../../utils/format';

/**
 * Panel perhitungan. Menampilkan HASIL backend apa adanya —
 * TIDAK menghitung ulang formula di frontend (aturan audit).
 */
export default function CalculationSummary({
  result,
  standard,
}: {
  result: EvaluationResult;
  standard?: Standard;
}) {
  const rows: Array<[string, string]> = [
    ['Keliling (P)', `${formatNumber(result.p_keliling)} mm`],
    ['Luas Babbit total', `${formatNumber(result.a_babbit)} mm²`],
    ['Luas Zone A', `${formatNumber(result.a_zone_a)} mm²`],
    ['Luas Zone C', `${formatNumber(result.a_zone_c)} mm²`],
    ['Total Unbound Zone A', `${formatNumber(result.a_unbond_zone_a)} mm²`],
    ['Total Unbound Zone C', `${formatNumber(result.a_unbond_zone_c)} mm²`],
    ['% Unbound Zone A', `${formatNumber(result.persen_unbond_zone_a)} %`],
    ['% Unbound Zone C', `${formatNumber(result.persen_unbond_zone_c)} %`],
  ];

  return (
    <section className="rounded-lg border border-[#E2E8F0] bg-white p-4" aria-label="Hasil perhitungan">
      <h3 className="text-[15px] font-semibold">Calculation</h3>
      <dl className="mt-2 divide-y divide-[#E2E8F0] text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-1.5">
            <dt className="text-[#64748B]">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-[#64748B]">Acceptance Criteria (toleransi)</dt>
          <dd className="font-medium">
            {standard ? `≤ ${formatNumber(standard.toleransi_persen)} % per zona` : '-'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
