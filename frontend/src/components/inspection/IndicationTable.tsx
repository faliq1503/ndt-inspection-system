import type { Indication } from '../../types/index';
import { formatNumber } from '../../utils/format';

interface Props {
  items: Indication[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onEdit: (ind: Indication) => void;
}

/**
 * Tabel indikasi. Kolom Area menampilkan properti model backend
 * (Indication.luas_mm2 = panjang × lebar) — bukan formula baru.
 * Kolom Luas Bond dan % juga dari backend (GET /components/:id),
 * dihitung per-indikasi terhadap luas zonanya masing-masing; null
 * sebelum komponen pernah di-calculate.
 * Delete belum tersedia karena backend tidak memiliki endpoint-nya.
 */
export default function IndicationTable({ items, selectedId, onSelect, onEdit }: Props) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-[#64748B]">Belum ada indikasi.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-[#64748B]">
            <th className="py-2 pr-3 font-medium">No</th>
            <th className="py-2 pr-3 font-medium">Zone</th>
            <th className="py-2 pr-3 font-medium">X</th>
            <th className="py-2 pr-3 font-medium">Y</th>
            <th className="py-2 pr-3 font-medium">Length (mm)</th>
            <th className="py-2 pr-3 font-medium">Width (mm)</th>
            <th className="py-2 pr-3 font-medium">Area (L×W)</th>
            <th className="py-2 pr-3 font-medium">Luas Bond</th>
            <th className="py-2 pr-3 font-medium">%</th>
            <th className="py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((ind, i) => (
            <tr
              key={ind.id}
              onClick={() => onSelect(ind.id)}
              className={`cursor-pointer border-b border-[#E2E8F0] last:border-0 hover:bg-[#E8F4FC] ${
                selectedId === ind.id ? 'bg-[#E8F4FC]' : ''
              }`}
            >
              <td className="py-2 pr-3">{String(i + 1).padStart(2, '0')}</td>
              <td className="py-2 pr-3">{ind.zona}</td>
              <td className="py-2 pr-3">{ind.posisi_x ?? '-'}</td>
              <td className="py-2 pr-3">{ind.posisi_y ?? '-'}</td>
              <td className="py-2 pr-3">{formatNumber(ind.panjang_mm)}</td>
              <td className="py-2 pr-3">{formatNumber(ind.lebar_mm)}</td>
              <td className="py-2 pr-3">{formatNumber(ind.panjang_mm * ind.lebar_mm)}</td>
              <td className="py-2 pr-3">
                {ind.a_bond_individual !== null ? `${formatNumber(ind.a_bond_individual)} mm²` : '-'}
              </td>
              <td className="py-2 pr-3">
                {ind.persen_individual !== null ? `${formatNumber(ind.persen_individual)} %` : '-'}
              </td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(ind);
                  }}
                  className="font-medium text-[#0072CE] hover:underline"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
