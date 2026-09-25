import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Loading from '../components/common/Loading';
import StatusBadge from '../components/common/StatusBadge';
import { inspectionService } from '../services/inspectionService';
import type { ResultRow } from '../types/index';
import { formatNumber } from '../utils/format';

/** Halaman /dashboard — ringkasan dari GET /results (tanpa mock). */
export default function DashboardPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    inspectionService
      .listResults()
      .then((data) => {
        setRows(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat dashboard.');
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const acc = rows.filter((r) => r.status === 'ACCEPT').length;
    return { total: rows.length, acc, reject: rows.length - acc };
  }, [rows]);

  const recent = useMemo(() => rows.slice(0, 8), [rows]);

  if (loading) return <Loading label="Memuat dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const cards = [
    { label: 'Total Inspection', value: String(stats.total) },
    { label: 'ACC', value: String(stats.acc) },
    { label: 'REJECT', value: String(stats.reject) },
    // PLACEHOLDER: backend /results tidak mengembalikan jumlah indikasi.
    { label: 'Total Indication', value: '—', note: 'Belum ada endpoint agregat' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-[#64748B]">Overview of NDT inspection activities</p>
        </div>
        <Link
          to="/inspection/new"
          className="rounded-md bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#005B9A]"
        >
          + New Inspection
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-[#E2E8F0] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
            {c.note && <p className="mt-1 text-xs text-[#64748B]">{c.note}</p>}
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
        <h2 className="text-[15px] font-semibold">Recent Inspection</h2>
        {recent.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Belum ada inspeksi."
              action={
                <Link
                  to="/inspection/new"
                  className="rounded-md bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#005B9A]"
                >
                  + New Inspection
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                  <th className="py-2 pr-4 font-medium">Inspection ID</th>
                  <th className="py-2 pr-4 font-medium">Component</th>
                  <th className="py-2 pr-4 font-medium">Zone</th>
                  <th className="py-2 pr-4 font-medium">% Unbound A</th>
                  <th className="py-2 pr-4 font-medium">% Unbound C</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-[#E2E8F0] last:border-0">
                    <td className="py-2 pr-4 font-medium">#{r.id}</td>
                    <td className="py-2 pr-4">{r.jenis_benda}</td>
                    <td className="py-2 pr-4">{r.zona}</td>
                    <td className="py-2 pr-4">{formatNumber(r.persen_unbond_zone_a)} %</td>
                    <td className="py-2 pr-4">{formatNumber(r.persen_unbond_zone_c)} %</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2">
                      <Link
                        to={`/inspection/${r.id}`}
                        className="font-medium text-[#0072CE] hover:underline"
                      >
                        View
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
  );
}
