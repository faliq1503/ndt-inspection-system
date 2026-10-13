import type { EvaluationResult, Indication } from '../../types/index';
import { formatNumber } from '../../utils/format';

/**
 * Total indikasi per zona (seperti baris TOTAL di Excel).
 * Angka total unbond, luas bond, dan % berasal dari backend (hasil perhitungan);
 * komponen ini hanya menampilkan. Jumlah indikasi hanya menghitung baris tabel.
 */
export default function IndicationTotals({
  result,
  indications = [],
}: {
  result: EvaluationResult;
  indications?: Indication[];
}) {
  const rows = [
    {
      zona: 'A',
      jumlah: indications.filter((i) => i.zona === 'A').length,
      unbond: result.a_unbond_zone_a,
      bond: result.a_bond_zone_a,
      persen: result.persen_unbond_zone_a,
    },
    {
      zona: 'C',
      jumlah: indications.filter((i) => i.zona === 'C').length,
      unbond: result.a_unbond_zone_c,
      bond: result.a_bond_zone_c,
      persen: result.persen_unbond_zone_c,
    },
  ];

  return (
    <div className="mt-3 overflow-x-auto border-t border-[#E2E8F0] pt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Total Indikasi per Zona</p>
      <table className="w-full whitespace-nowrap text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-[#64748B]">
            <th className="py-1.5 pr-4 font-medium">Zona</th>
            <th className="py-1.5 pr-4 text-right font-medium">Jumlah</th>
            <th className="py-1.5 pr-4 text-right font-medium">Total Unbound (mm²)</th>
            <th className="py-1.5 pr-4 text-right font-medium">Luas Bond (mm²)</th>
            <th className="py-1.5 text-right font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.zona} className="border-b border-[#E2E8F0] last:border-0">
              <td className="py-1.5 pr-4 font-semibold">Zona {r.zona}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{r.jumlah}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{formatNumber(r.unbond)}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{formatNumber(r.bond)}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">{formatNumber(r.persen)} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}