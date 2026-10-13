import type { EvaluationResult, Standard } from '../../types/index';
import { formatNumber } from '../../utils/format';

/**
 * Panel perhitungan. Menampilkan HASIL backend apa adanya —
 * TIDAK menghitung ulang formula di frontend (aturan audit).
 */
export default function CalculationSummary({
  result,
  standard,
  emphasize = false,
}: {
  result: EvaluationResult;
  standard?: Standard;
  /** Penekanan % Unbound & toleransi (dipakai halaman Inspeksi Baru). */
  emphasize?: boolean;
}) {
  const rows: Array<[string, string, boolean]> = [
    ['Keliling (P)', `${formatNumber(result.p_keliling)} mm`, false],
    ['Luas Babbit total', `${formatNumber(result.a_babbit)} mm²`, false],
    ['Luas Zona A', `${formatNumber(result.a_zone_a)} mm²`, false],
    ['Luas Zona C', `${formatNumber(result.a_zone_c)} mm²`, false],
    ['Total Unbound Zona A', `${formatNumber(result.a_unbond_zone_a)} mm²`, false],
    ['Total Unbound Zona C', `${formatNumber(result.a_unbond_zone_c)} mm²`, false],
    ['% Unbound Zona A', `${formatNumber(result.persen_unbond_zone_a)} %`, true],
    ['% Unbound Zona C', `${formatNumber(result.persen_unbond_zone_c)} %`, true],
  ];

  return (
    <section className="rounded-lg border border-[#E2E8F0] bg-white p-4" aria-label="Hasil perhitungan">
      <h3 className="text-[15px] font-semibold">Perhitungan</h3>
      <dl className="mt-2 divide-y divide-[#E2E8F0] text-sm">
        {rows.map(([k, v, hot]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-1.5">
            <dt className="text-[#64748B]">{k}</dt>
            <dd
              className={
                emphasize && hot
                  ? 'text-right text-base font-bold tabular-nums text-[#172033]'
                  : 'text-right font-medium tabular-nums text-[#172033]'
              }
            >
              {v}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-[#64748B]">Kriteria Penerimaan (toleransi)</dt>
          <dd
            className={
              emphasize
                ? 'text-right text-base font-bold tabular-nums text-[#0072CE]'
                : 'text-right font-medium tabular-nums text-[#172033]'
            }
          >
            {standard ? `≤ ${formatNumber(standard.toleransi_persen)} % per zona` : '-'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
