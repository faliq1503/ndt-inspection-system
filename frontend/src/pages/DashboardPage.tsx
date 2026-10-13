import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Loading from '../components/common/Loading';
import StatusBadge from '../components/common/StatusBadge';
import { inspectionService } from '../services/inspectionService';
import type { ResultRow } from '../types/index';
import { formatNumber } from '../utils/format';

/** Ikon outline konsisten (inline SVG, tanpa lib baru). */
function CardIcon({ children, tone }: { children: ReactNode; tone: 'primary' | 'success' | 'danger' }) {
  const color =
    tone === 'success' ? 'text-[#16A34A]' : tone === 'danger' ? 'text-[#DC2626]' : 'text-[#0072CE]';
  return (
    <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5F7FA] ${color}`}>
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
  const bar = accent === 'success' ? 'bg-[#16A34A]' : accent === 'danger' ? 'bg-[#DC2626]' : 'bg-transparent';
  const numberColor =
    accent === 'success'
      ? 'text-[#16A34A]'
      : accent === 'danger'
        ? 'text-[#DC2626]'
        : 'text-[#172033]';
  return (
    <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
      <div aria-hidden="true" className={`h-[3px] ${bar}`} />
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{label}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className={`text-3xl font-bold tabular-nums ${numberColor}`}>{value}</p>
          {icon}
        </div>
        {note && <p className="mt-2 text-xs text-[#64748B]">{note}</p>}
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
          <circle cx="70" cy="70" r={r} fill="none" stroke="#E2E8F0" strokeWidth="16" />
          {total > 0 && (
            <>
              <circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke="#16A34A"
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
                stroke="#DC2626"
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
          <p className="text-2xl font-bold tabular-nums text-[#172033]">{total}</p>
          <p className="text-xs text-[#64748B]">inspeksi</p>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        <li className="flex items-center justify-between rounded-md bg-[#F5F7FA] px-3 py-2">
          <span className="flex items-center gap-2 font-medium text-[#172033]">
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-[#16A34A]" />
            ACC
          </span>
          <span className="tabular-nums text-[#64748B]">
            {acc} · {accPct}%
          </span>
        </li>
        <li className="flex items-center justify-between rounded-md bg-[#F5F7FA] px-3 py-2">
          <span className="flex items-center gap-2 font-medium text-[#172033]">
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-[#DC2626]" />
            REJECT
          </span>
          <span className="tabular-nums text-[#64748B]">
            {reject} · {rejectPct}%
          </span>
        </li>
      </ul>
    </div>
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
          <p className="text-sm text-[#64748B]">Ringkasan aktivitas inspeksi NDT</p>
        </div>
        <Link
          to="/inspection/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#005B9A]"
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

      <div className="grid gap-4 xl:grid-cols-3">
        {stats.total > 0 && (
          <section className="rounded-lg border border-[#E2E8F0] bg-white p-4" aria-label="Perbandingan hasil">
            <h2 className="text-[15px] font-semibold">Perbandingan Hasil</h2>
            <div className="mt-3">
              <AccRejectDonut acc={stats.acc} reject={stats.reject} />
            </div>
          </section>
        )}

        <section
          className={`rounded-lg border border-[#E2E8F0] bg-white p-4 ${stats.total > 0 ? 'xl:col-span-2' : 'xl:col-span-3'}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Inspeksi Terbaru</h2>
            {recent.length > 0 && (
              <Link
                to="/inspection/history"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#0072CE] hover:underline"
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
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#005B9A]"
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
            <div className="mt-2 overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs text-[#64748B]">
                    <th className="py-2 pr-4 font-medium">ID Inspeksi</th>
                    <th className="py-2 pr-4 font-medium">Komponen</th>
                    <th className="py-2 pr-4 font-medium">Upper/Lower</th>
                    <th className="py-2 pr-4 text-right font-medium">% Unbound A</th>
                    <th className="py-2 pr-4 text-right font-medium">% Unbound C</th>
                    <th className="py-2 pr-4 font-medium">Hasil</th>
                    <th className="py-2 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#E8F4FC]">
                      <td className="py-2 pr-4 font-semibold">#{r.id}</td>
                      <td className="py-2 pr-4 capitalize">{r.jenis_benda}</td>
                      <td className="py-2 pr-4">{r.zona}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatNumber(r.persen_unbond_zone_a)} %
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatNumber(r.persen_unbond_zone_c)} %
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-2">
                        <Link
                          to={`/inspection/${r.id}`}
                          className="inline-flex items-center gap-1 font-medium text-[#0072CE] hover:underline"
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
          )}
        </section>
      </div>
    </div>
  );
}
