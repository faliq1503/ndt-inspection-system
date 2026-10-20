import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Loading from '../components/common/Loading';
import PercentValue from '../components/common/PercentValue';
import StatusBadge from '../components/common/StatusBadge';
import { inspectionService } from '../services/inspectionService';
import type { ResultRow } from '../types/index';
import { formatShortDate, parseDbDate } from '../utils/format';

/** Ikon outline konsisten (inline SVG, tanpa lib baru). */
function CardIcon({ children, tone }: { children: ReactNode; tone: 'primary' | 'success' | 'danger' }) {
  const color =
    tone === 'success' ? 'text-ndt-success' : tone === 'danger' ? 'text-ndt-danger' : 'text-ndt-primary';
  return (
    <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-ndt-bg ${color}`}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </span>
  );
}

type Accent = 'neutral' | 'success' | 'danger';

function StatCard({
  label,
  value,
  note,
  icon,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  icon: ReactNode;
  accent: Accent;
}) {
  const bar = accent === 'success' ? 'bg-ndt-success' : accent === 'danger' ? 'bg-ndt-danger' : 'bg-transparent';
  const numberColor =
    accent === 'success'
      ? 'text-ndt-success'
      : accent === 'danger'
        ? 'text-ndt-danger'
        : 'text-ndt-text';
  return (
    <div className="overflow-hidden rounded-lg border border-ndt-border bg-white">
      <div aria-hidden="true" className={`h-[3px] ${bar}`} />
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ndt-muted">{label}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className={`text-3xl font-bold tabular-nums ${numberColor}`}>{value}</p>
          {icon}
        </div>
        {note && <p className="mt-2 text-xs text-ndt-muted">{note}</p>}
      </div>
    </div>
  );
}

/** Donut ACC vs REJECT dari data aktual (SVG murni, tanpa lib grafik). */
function AccRejectDonut({ acc, reject }: { acc: number; reject: number }) {
  const total = acc + reject;
  const r = 56;
  const c = 2 * Math.PI * r;
  const accLen = total === 0 ? 0 : (acc / total) * c;
  const accPct = total === 0 ? 0 : Math.round((acc / total) * 100);
  const rejectPct = total === 0 ? 0 : 100 - accPct;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative shrink-0" role="img" aria-label={`Perbandingan ACC ${acc} dan REJECT ${reject}`}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--color-ndt-border)" strokeWidth="16" />
          {total > 0 && (
            <>
              <circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke="var(--color-ndt-success)"
                strokeWidth="16"
                strokeDasharray={`${accLen} ${c}`}
                transform="rotate(-90 70 70)"
                strokeLinecap="butt"
              />
              <circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke="var(--color-ndt-danger)"
                strokeWidth="16"
                strokeDasharray={`${c - accLen} ${c}`}
                strokeDashoffset={-accLen}
                transform="rotate(-90 70 70)"
                strokeLinecap="butt"
              />
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tabular-nums text-ndt-text">{total}</p>
          <p className="text-xs text-ndt-muted">inspeksi</p>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        <li className="flex items-center justify-between rounded-md bg-ndt-bg px-3 py-2">
          <span className="flex items-center gap-2 font-medium text-ndt-text">
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-ndt-success" />
            ACC
          </span>
          <span className="tabular-nums text-ndt-muted">
            {acc} · {accPct}%
          </span>
        </li>
        <li className="flex items-center justify-between rounded-md bg-ndt-bg px-3 py-2">
          <span className="flex items-center gap-2 font-medium text-ndt-text">
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-ndt-danger" />
            REJECT
          </span>
          <span className="tabular-nums text-ndt-muted">
            {reject} · {rejectPct}%
          </span>
        </li>
      </ul>
    </div>
  );
}

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Jumlah ACC/REJECT per bulan untuk 6 bulan terakhir (berdasarkan tanggal inspeksi). */
function monthlyTrend(rows: ResultRow[], months = 6) {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: `${BULAN_SINGKAT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, acc: 0, reject: 0 };
  });
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const r of rows) {
    const d = parseDbDate(r.tanggal_input);
    if (!d) continue;
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i === undefined) continue;
    if (r.status === 'ACCEPT') buckets[i].acc += 1;
    else buckets[i].reject += 1;
  }
  return buckets;
}

/** Grafik batang bertumpuk ACC/REJECT per bulan (SVG murni, tanpa lib grafik). */
function MonthlyTrendChart({ rows }: { rows: ResultRow[] }) {
  const data = useMemo(() => monthlyTrend(rows), [rows]);
  const max = Math.max(1, ...data.map((d) => d.acc + d.reject));
  const tinggi = 140;
  return (
    <div>
      <div className="flex h-[168px] items-end gap-2 sm:gap-4" role="img" aria-label="Tren jumlah inspeksi per bulan">
        {data.map((d) => {
          const total = d.acc + d.reject;
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.acc} ACC, ${d.reject} REJECT`}>
              <span className="text-xs font-semibold tabular-nums text-ndt-text">{total || ''}</span>
              <div className="flex w-full max-w-10 flex-col overflow-hidden rounded-t-md bg-ndt-bg" style={{ height: tinggi }}>
                <div className="mt-auto bg-ndt-danger" style={{ height: (d.reject / max) * tinggi }} />
                <div className="bg-ndt-success" style={{ height: (d.acc / max) * tinggi }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2 sm:gap-4">
        {data.map((d) => (
          <span key={d.key} className="flex-1 text-center text-[11px] text-ndt-muted">
            {d.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-ndt-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-ndt-success" /> ACC
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-ndt-danger" /> REJECT
        </span>
      </div>
    </div>
  );
}

/** Jumlah inspeksi & tingkat REJECT per unit asal (5 unit terbanyak). */
function UnitBreakdown({ rows }: { rows: ResultRow[] }) {
  const units = useMemo(() => {
    const map = new Map<string, { total: number; reject: number }>();
    for (const r of rows) {
      const nama = r.unit_asal?.trim() || 'Tanpa unit';
      const u = map.get(nama) ?? { total: 0, reject: 0 };
      u.total += 1;
      if (r.status !== 'ACCEPT') u.reject += 1;
      map.set(nama, u);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  }, [rows]);
  const max = Math.max(1, ...units.map(([, u]) => u.total));

  return (
    <ul className="space-y-3">
      {units.map(([nama, u]) => (
        <li key={nama}>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium text-ndt-text" title={nama}>
              {nama}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-ndt-muted">
              {u.total} inspeksi · <span className="text-ndt-danger">{u.reject} REJECT</span>
            </span>
          </div>
          <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-ndt-bg" style={{ width: `${(u.total / max) * 100}%` }}>
            <div className="bg-ndt-success" style={{ width: `${((u.total - u.reject) / u.total) * 100}%` }} />
            <div className="bg-ndt-danger" style={{ width: `${(u.reject / u.total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Halaman /dashboard — ringkasan dari GET /results + GET /indications/count. */
export default function DashboardPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [totalIndication, setTotalIndication] = useState<number | null>(null);
  const [totalFailed, setTotalFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    setTotalFailed(false);
    inspectionService
      .listResults()
      .then((data) => {
        setRows(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat dasbor.');
        setLoading(false);
      });
    inspectionService
      .totalIndications()
      .then((total) => setTotalIndication(total))
      .catch(() => {
        setTotalIndication(null);
        setTotalFailed(true);
      });
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const acc = rows.filter((r) => r.status === 'ACCEPT').length;
    const reject = rows.length - acc;
    const accPct = rows.length === 0 ? null : Math.round((acc / rows.length) * 100);
    return { total: rows.length, acc, reject, accPct };
  }, [rows]);

  const recent = useMemo(() => rows.slice(0, 8), [rows]);

  if (loading) return <Loading label="Memuat dasbor..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dasbor</h1>
          <p className="text-sm text-ndt-muted">Ringkasan aktivitas inspeksi NDT</p>
        </div>
        <Link
          to="/inspection/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-ndt-primary px-4 py-2 text-sm font-medium text-white hover:bg-ndt-primary-dark"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Inspeksi Baru
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total Inspeksi"
          value={String(stats.total)}
          accent="neutral"
          icon={
            <CardIcon tone="primary">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="15" y2="17" />
            </CardIcon>
          }
        />
        <StatCard
          label="Total Indikasi"
          value={totalIndication === null ? '—' : String(totalIndication)}
          note={totalFailed ? 'Gagal memuat data' : undefined}
          accent="neutral"
          icon={
            <CardIcon tone="primary">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="12" cy="12" r="0.5" />
            </CardIcon>
          }
        />
        <StatCard
          label="ACC"
          value={String(stats.acc)}
          note={stats.accPct === null ? undefined : `${stats.accPct}% dari total inspeksi`}
          accent="success"
          icon={
            <CardIcon tone="success">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </CardIcon>
          }
        />
        <StatCard
          label="REJECT"
          value={String(stats.reject)}
          accent="danger"
          icon={
            <CardIcon tone="danger">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </CardIcon>
          }
        />
      </div>

      {stats.total > 0 && (
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="min-w-0 rounded-lg border border-ndt-border bg-white p-4" aria-label="Perbandingan hasil">
            <h2 className="text-[15px] font-semibold">Perbandingan Hasil</h2>
            <div className="mt-4">
              <AccRejectDonut acc={stats.acc} reject={stats.reject} />
            </div>
          </section>
          <section className="min-w-0 rounded-lg border border-ndt-border bg-white p-4 xl:col-span-2" aria-label="Tren inspeksi">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold">Tren Inspeksi</h2>
              <span className="text-xs text-ndt-muted">6 bulan terakhir</span>
            </div>
            <div className="mt-3">
              <MonthlyTrendChart rows={rows} />
            </div>
          </section>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <section className={`min-w-0 rounded-lg border border-ndt-border bg-white p-4 ${stats.total > 0 ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Inspeksi Terbaru</h2>
            {recent.length > 0 && (
              <Link
                to="/inspection/history"
                className="inline-flex items-center gap-1 text-sm font-medium text-ndt-primary hover:underline"
              >
                Lihat Semua
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="Belum ada inspeksi."
                action={
                  <Link
                    to="/inspection/new"
                    className="inline-flex items-center gap-1.5 rounded-md bg-ndt-primary px-4 py-2 text-sm font-medium text-white hover:bg-ndt-primary-dark"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Inspeksi Baru
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              {/* Tabel: tablet & desktop */}
              <div className="mt-2 hidden overflow-x-auto sm:block">
                <table className="w-full whitespace-nowrap text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-ndt-border text-xs text-ndt-muted">
                      <th className="py-2 pr-4 font-medium">ID</th>
                      <th className="py-2 pr-4 font-medium">Tanggal</th>
                      <th className="py-2 pr-4 font-medium">Komponen</th>
                      <th className="py-2 pr-4 text-right font-medium">% Unbond A</th>
                      <th className="py-2 pr-4 text-right font-medium">% Unbond C</th>
                      <th className="py-2 pr-4 font-medium">Hasil</th>
                      <th className="py-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id} className="border-b border-ndt-border last:border-0 hover:bg-ndt-primary-light/60">
                        <td className="py-2 pr-4 font-semibold">#{r.id}</td>
                        <td className="py-2 pr-4 tabular-nums">{formatShortDate(r.tanggal_input)}</td>
                        <td className="py-2 pr-4">
                          <span className="capitalize">{r.jenis_benda}</span>
                          {r.zona && <span className="ml-1.5 text-ndt-muted">· {r.zona}</span>}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <PercentValue value={r.persen_unbond_zone_a} />
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <PercentValue value={r.persen_unbond_zone_c} />
                        </td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-2">
                          <Link
                            to={`/inspection/${r.id}`}
                            className="inline-flex items-center gap-1 font-medium text-ndt-primary hover:underline"
                          >
                            Lihat
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <path d="M12 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Daftar ringkas: HP */}
              <ul className="mt-2 divide-y divide-ndt-border sm:hidden">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link to={`/inspection/${r.id}`} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          #{r.id} · <span className="capitalize">{r.jenis_benda}</span>
                        </span>
                        <span className="block text-xs text-ndt-muted">
                          {formatShortDate(r.tanggal_input)} · A <PercentValue value={r.persen_unbond_zone_a} /> · C{' '}
                          <PercentValue value={r.persen_unbond_zone_c} />
                        </span>
                      </span>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {stats.total > 0 && (
          <section className="min-w-0 rounded-lg border border-ndt-border bg-white p-4" aria-label="Inspeksi per unit asal">
            <h2 className="text-[15px] font-semibold">Per Unit Asal</h2>
            <p className="mb-3 text-xs text-ndt-muted">5 unit dengan inspeksi terbanyak</p>
            <UnitBreakdown rows={rows} />
          </section>
        )}
      </div>
    </div>
  );
}
