import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import StatusBadge from '../components/common/StatusBadge';
import { inspectionService } from '../services/inspectionService';
import type { EvaluationStatus, ResultRow } from '../types/index';
import { formatNumber } from '../utils/format';

const PAGE_SIZE = 10;

/** Halaman /inspection/history — tabel + search + filter + pagination. */
export default function HistoryPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | EvaluationStatus>('ALL');
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [dlError, setDlError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : 'Gagal memuat riwayat.');
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'ALL' && r.status !== filter) return false;
      if (!q) return true;
      return (
        String(r.id).includes(q) ||
        r.jenis_benda.toLowerCase().includes(q) ||
        r.zona.toLowerCase().includes(q) ||
        (r.inspector ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /** Export PDF backend (reportlab) untuk satu baris inspeksi. */
  async function handleExportPdf(resultId: number) {
    setDlError(null);
    setDownloadingId(resultId);
    try {
      await inspectionService.downloadReportPdf(resultId);
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Gagal mengunduh PDF.');
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) return <Loading label="Memuat inspection history..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Inspection History</h1>
          <p className="text-sm text-[#64748B]">View and manage completed inspections</p>
        </div>
        <button
          type="button"
          onClick={() =>
            inspectionService
              .downloadExcel()
              .catch((err: unknown) => window.alert(err instanceof Error ? err.message : 'Gagal mengunduh Excel.'))
          }
          className="rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium hover:bg-[#F5F7FA]"
        >
          Export Excel
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-[#E2E8F0] bg-white p-4 sm:flex-row">
        <div className="flex-1">
            <Input
              label="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            placeholder="Search Inspection ID / Component / Inspector..."
          />
        </div>
        <div>
          <label htmlFor="result-filter" className="mb-1 block text-[13px] font-medium">
            Result
          </label>
          <select
            id="result-filter"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as 'ALL' | EvaluationStatus);
              setPage(1);
            }}
            className="rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="ACCEPT">ACC</option>
            <option value="REJECT">REJECT</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No inspections found."
          action={
            <Link
              to="/inspection/new"
              className="rounded-md bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#005B9A]"
            >
              + New Inspection
            </Link>
          }
        />
      ) : (
        <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          {dlError && (
            <p role="alert" className="mb-3 rounded-md bg-[#DC2626]/10 px-3 py-2 text-sm text-[#DC2626]">
              {dlError}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                  <th className="py-2 pr-4 font-medium">Inspection ID</th>
                  <th className="py-2 pr-4 font-medium">Component</th>
                  <th className="py-2 pr-4 font-medium">Upper/Lower</th>
                  <th className="py-2 pr-4 font-medium">Inspector</th>
                  <th className="py-2 pr-4 font-medium">% Unbound A</th>
                  <th className="py-2 pr-4 font-medium">% Unbound C</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-[#E2E8F0] last:border-0">
                    <td className="py-2 pr-4 font-medium">#{r.id}</td>
                    <td className="py-2 pr-4">{r.jenis_benda}</td>
                    <td className="py-2 pr-4">{r.zona}</td>
                    <td className="py-2 pr-4">{r.inspector ?? '-'}</td>
                    <td className="py-2 pr-4">{formatNumber(r.persen_unbond_zone_a)} %</td>
                    <td className="py-2 pr-4">{formatNumber(r.persen_unbond_zone_c)} %</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2">
                      <span className="flex items-center gap-3">
                        <Link to={`/inspection/${r.id}`} className="font-medium text-[#0072CE] hover:underline">
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleExportPdf(r.id)}
                          disabled={downloadingId !== null}
                          title="Export laporan PDF baris ini"
                          className="rounded-md border border-[#0072CE]/40 bg-[#E8F4FC] px-2.5 py-1 text-xs font-semibold text-[#0072CE] hover:bg-[#0072CE] hover:text-white disabled:opacity-40"
                        >
                          {downloadingId === r.id ? 'Loading…' : 'Export PDF'}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-[#64748B]">
            <span>
              Page {safePage} of {totalPages} ({filtered.length} inspections)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="rounded-md border border-[#E2E8F0] px-3 py-1 font-medium text-[#172033] disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="rounded-md border border-[#E2E8F0] px-3 py-1 font-medium text-[#172033] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
