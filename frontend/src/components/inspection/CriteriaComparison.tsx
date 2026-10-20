import type { EvaluationResult, EvaluationStatus } from '../../types/index';
import { formatNumber } from '../../utils/format';
import StatusBadge from '../common/StatusBadge';

interface Row {
  kriteria: string;
  hasil: string;
  batas: string;
  status: EvaluationStatus | null;
}

function angka(v: number | null | undefined, satuan: string): string {
  return v === null || v === undefined ? '-' : `${formatNumber(v)} ${satuan}`;
}

function batas(v: number | null | undefined, satuan: string): string {
  return v === null || v === undefined ? '-' : `≤ ${formatNumber(v)} ${satuan}`;
}

/**
 * Perbandingan batas standar dengan hasil perhitungan.
 * Semua angka dan status berasal dari backend (disimpan saat inspeksi dihitung);
 * komponen ini hanya menampilkan, tidak menghitung ulang.
 * Hasil lama (dihitung sebelum fitur ini ada) bernilai null dan ditampilkan apa adanya.
 */
export default function CriteriaComparison({ result }: { result: EvaluationResult }) {
  const tersedia = result.toleransi_persen !== null && result.toleransi_persen !== undefined;

  const rows: Row[] = [
    {
      kriteria: 'Zona A: % unbond',
      hasil: angka(result.persen_unbond_zone_a, '%'),
      batas: batas(result.toleransi_persen, '%'),
      status: result.status_persen_zone_a ?? null,
    },
    {
      kriteria: 'Zona A: dimensi terbesar 1 indikasi',
      hasil: angka(result.dimensi_terbesar_zone_a, 'mm'),
      batas: batas(result.batas_dimensi_zone_a, 'mm'),
      status: result.status_dimensi_zone_a ?? null,
    },
    {
      kriteria: 'Zona C: % unbond',
      hasil: angka(result.persen_unbond_zone_c, '%'),
      batas: batas(result.toleransi_persen, '%'),
      status: result.status_persen_zone_c ?? null,
    },
    {
      kriteria: 'Zona C: luas terbesar 1 indikasi',
      hasil: angka(result.luas_terbesar_zone_c, 'mm²'),
      batas: batas(result.batas_luas_zone_c, 'mm²'),
      status: result.status_luas_zone_c ?? null,
    },
  ];

  return (
    <section
      className="rounded-lg border border-ndt-border bg-white p-4"
      aria-label="Perbandingan dengan batas standar"
    >
      <h3 className="text-[15px] font-semibold text-ndt-text">Perbandingan dengan Standar</h3>
      {!tersedia ? (
        <p className="mt-2 text-[13px] text-ndt-muted">
          Perbandingan batas tidak tersedia untuk hasil ini karena dihitung sebelum fitur ini ada.
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-ndt-border">
            {rows.map((r) => (
              <li key={r.kriteria} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ndt-text">{r.kriteria}</span>
                  {r.status ? (
                    <StatusBadge status={r.status} />
                  ) : (
                    <span className="text-xs text-ndt-muted">-</span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap justify-between gap-x-3 text-[13px] tabular-nums text-ndt-muted">
                  <span>
                    Hasil:{' '}
                    <strong
                      className={
                        r.status === 'REJECT'
                          ? 'text-ndt-danger'
                          : r.status === 'ACCEPT'
                            ? 'text-ndt-success'
                            : 'text-ndt-text'
                      }
                    >
                      {r.hasil}
                    </strong>
                  </span>
                  <span>
                    Batas: <strong className="text-ndt-text">{r.batas}</strong>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ndt-muted">
            Batas luas 1 indikasi Zona C adalah yang lebih kecil antara persentase luas Zona C dan batas
            mutlak (mm²) pada standar.
          </p>
        </>
      )}
    </section>
  );
}