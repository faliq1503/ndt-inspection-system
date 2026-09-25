import type { Indication } from '../../types/index';
import { formatNumber } from '../../utils/format';

interface Props {
  items: Indication[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

/** Tabel indikasi: No, X, Y, Length, Width, Area (L×W turunan tampilan). */
export default function IndicationTable({ items, selectedId, onSelect }: Props) {
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
            <th className="py-2 pr-3 font-medium">Area (mm²)</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
