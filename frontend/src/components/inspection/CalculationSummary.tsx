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
  /** Penekanan % Unbond & toleransi (dipakai halaman Inspeksi Baru). */
  emphasize?: boolean;
}) {
  const rows: Array<[string, string, boolean]> = [
    ['Panjang (P)', `${formatNumber(result.p_keliling)} mm`, false],
    ['Luas Babbit total', `${formatNumber(result.a_babbit)} mm²`, false],
    ['Luas Zona A', `${formatNumber(result.a_zone_a)} mm²`, false],
    ['Luas Zona C', `${formatNumber(result.a_zone_c)} mm²`, false],
    ['Total Unbond Zona A', `${formatNumber(result.a_unbond_zone_a)} mm²`, false],
    ['Total Unbond Zona C', `${formatNumber(result.a_unbond_zone_c)} mm²`, false],
    ['% Unbond Zona A', `${formatNumber(result.persen_unbond_zone_a)} %`, true],
    ['% Unbond Zona C', `${formatNumber(result.persen_unbond_zone_c)} %`, true],
  ];

  return (
    <section className="rounded-lg border border-ndt-border bg-white p-4" aria-label="Hasil perhitungan">
      <h3 className="text-[15px] font-semibold">Perhitungan</h3>
      <dl className="mt-2 divide-y divide-ndt-border text-sm">
        {rows.map(([k, v, hot]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-1.5">
            <dt className="text-ndt-muted">{k}</dt>
            <dd
              className={
                emphasize && hot
                  ? 'text-right text-base font-bold tabular-nums text-ndt-text'
                  : 'text-right font-medium tabular-nums text-ndt-text'
              }
            >
              {v}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 py-1.5">
          <dt className="text-ndt-muted">Kriteria Penerimaan (toleransi)</dt>
          <dd
            className={
              emphasize
                ? 'text-right text-base font-bold tabular-nums text-ndt-primary'
                : 'text-right font-medium tabular-nums text-ndt-text'
            }
          >
            {standard ? `≤ ${formatNumber(standard.toleransi_persen)} % per zona` : '-'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
