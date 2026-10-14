import type { Indication } from '../../types/index';
import { formatNumber } from '../../utils/format';

interface Props {
  items: Indication[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onEdit: (ind: Indication) => void;
  /** Sembunyikan kolom Aksi (mis. tampilan detail read-only). Default false. */
  hideActions?: boolean;
  /** Ikon lihat foto bukti (hanya tampil pada baris yang punya bukti). */
  onViewBukti?: (ind: Indication) => void;
}

/**
 * Tabel indikasi. Kolom Area menampilkan properti model backend
 * (Indication.luas_mm2 = panjang × lebar) — bukan formula baru.
 * Kolom Luas Bond dan % juga dari backend (GET /components/:id),
 * dihitung per-indikasi terhadap luas zonanya masing-masing; null
 * sebelum komponen pernah di-calculate.
 * Delete belum tersedia karena backend tidak memiliki endpoint-nya.
 */
export default function IndicationTable({ items, selectedId, onSelect, onEdit, hideActions = false, onViewBukti }: Props) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-[#64748B]">Belum ada indikasi.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-[#64748B]">
            <th className="py-2 pr-3 font-medium">No</th>
            <th className="py-2 pr-3 font-medium">Zona</th>
            <th className="py-2 pr-3 text-right font-medium">X</th>
            <th className="py-2 pr-3 text-right font-medium">Y</th>
            <th className="py-2 pr-3 text-right font-medium">Panjang (mm)</th>
            <th className="py-2 pr-3 text-right font-medium">Lebar (mm)</th>
            <th className="py-2 pr-3 text-right font-medium">Luas (mm²)</th>
            <th className="py-2 pr-3 text-right font-medium">Luas Bond</th>
            <th className="py-2 pr-3 text-right font-medium">%</th>
            {!hideActions && <th className="py-2 font-medium">Aksi</th>}
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
              <td className="py-2 pr-3">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-[#E8F4FC] px-1 text-[11px] font-bold text-[#0072CE]">
                  {ind.zona}
                </span>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{ind.posisi_x ?? '-'}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{ind.posisi_y ?? '-'}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(ind.panjang_mm)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(ind.lebar_mm)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(ind.panjang_mm * ind.lebar_mm)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {ind.a_bond_individual !== null ? `${formatNumber(ind.a_bond_individual)} mm²` : '-'}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {ind.persen_individual !== null ? `${formatNumber(ind.persen_individual)} %` : '-'}
              </td>
              {!hideActions && (
                <td className="py-2">
                  <span className="flex items-center gap-1">
                    {onViewBukti && ind.bukti_path && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewBukti(ind);
                        }}
                        title={`Lihat foto bukti indikasi #${i + 1}`}
                        aria-label={`Lihat foto bukti indikasi #${i + 1}`}
                        className="rounded-md p-1.5 text-[#0072CE] hover:bg-[#E8F4FC]"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(ind);
                      }}
                      title={`Ubah indikasi #${i + 1}`}
                      className="inline-flex items-center gap-1 font-medium text-[#0072CE] hover:underline"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                      Ubah
                    </button>
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
