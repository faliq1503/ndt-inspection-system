import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/common/ConfirmDialog';
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
  const [deleteTarget, setDeleteTarget] = useState<ResultRow | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  /** Nomor halaman aktual (jendela maks. 5 di sekitar halaman aktif). */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.min(Math.max(safePage - 2, 1), totalPages - 4);
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [totalPages, safePage]);

  /** Hapus satu inspeksi via endpoint bulk yang sudah ada. */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDlError(null);
    try {
      await inspectionService.bulkDeleteResults([deleteTarget.id]);
      load();
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Gagal menghapus inspeksi.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

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

  if (loading) return <Loading label="Memuat riwayat inspeksi..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Riwayat Inspeksi</h1>
          <p className="text-sm text-[#64748B]">Lihat dan kelola inspeksi yang telah selesai</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              inspectionService
                .downloadExcel()
                .catch((err: unknown) => setDlError(err instanceof Error ? err.message : 'Gagal mengunduh Excel.'))
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#172033] hover:bg-[#E8F4FC]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Ekspor Excel
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-[#E2E8F0] bg-white p-4 sm:flex-row">
        <div className="flex-1">
            <Input
              label="Cari"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari ID Inspeksi / Komponen / Inspektur..."
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.5" y2="16.5" />
                </svg>
              }
            />
        </div>
        <div>
          <label htmlFor="result-filter" className="mb-1 block text-[13px] font-medium">
            Hasil
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
            <option value="ALL">Semua</option>
            <option value="ACCEPT">ACC</option>
            <option value="REJECT">REJECT</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        rows.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat inspeksi."
            action={
              <Link
                to="/inspection/new"
                className="rounded-md bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#005B9A]"
              >
                + Inspeksi Baru
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="Tidak ada hasil yang cocok dengan pencarian."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilter('ALL');
                  setPage(1);
                }}
                className="rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#172033] hover:bg-[#E8F4FC]"
              >
                Atur Ulang Pencarian
              </button>
            }
          />
        )
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
                <tr className="border-b border-[#E2E8F0] text-xs text-[#64748B]">
                  <th className="py-2 pr-4 font-medium">ID Inspeksi</th>
                  <th className="py-2 pr-4 font-medium">Komponen</th>
                  <th className="py-2 pr-4 font-medium">Upper/Lower</th>
                  <th className="py-2 pr-4 font-medium">Inspektur</th>
                  <th className="py-2 pr-4 text-right font-medium">% Unbound A</th>
                  <th className="py-2 pr-4 text-right font-medium">% Unbound C</th>
                  <th className="py-2 pr-4 font-medium">Hasil</th>
                  <th className="py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#E8F4FC]">
                    <td className="py-2 pr-4 font-semibold text-[#0072CE]">#{r.id}</td>
                    <td className="py-2 pr-4 capitalize">{r.jenis_benda}</td>
                    <td className="py-2 pr-4">{r.zona && r.zona.trim() ? r.zona : '—'}</td>
                    <td className="py-2 pr-4">{r.inspector ?? '-'}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(r.persen_unbond_zone_a)} %</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(r.persen_unbond_zone_c)} %</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2">
                      <span className="flex items-center gap-1">
                        <Link
                          to={`/inspection/${r.id}`}
                          title={`Detail inspeksi #${r.id}`}
                          aria-label={`Detail inspeksi #${r.id}`}
                          className="rounded-md p-1.5 text-[#0072CE] hover:bg-[#E8F4FC]"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleExportPdf(r.id)}
                          disabled={downloadingId !== null}
                          title={`Ekspor PDF inspeksi #${r.id}`}
                          aria-label={`Ekspor PDF inspeksi #${r.id}`}
                          className="rounded-md p-1.5 text-[#172033] hover:bg-[#E8F4FC] hover:text-[#0072CE] disabled:opacity-40"
                        >
                          {downloadingId === r.id ? (
                            <span aria-hidden="true" className="block h-4 w-4 animate-spin rounded-full border-2 border-[#0072CE]/30 border-t-[#0072CE]" />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <path d="M7 10l5 5 5-5" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
                          title={`Hapus inspeksi #${r.id}`}
                          aria-label={`Hapus inspeksi #${r.id}`}
                          className="rounded-md p-1.5 text-[#64748B] hover:bg-[#DC2626]/10 hover:text-[#DC2626]"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[#64748B]">
            <span className="tabular-nums">{filtered.length} inspeksi</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="rounded-md border border-[#E2E8F0] px-3 py-1 font-medium text-[#172033] hover:bg-[#E8F4FC] disabled:opacity-40"
              >
                Sebelumnya
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-label={`Halaman ${n}`}
                  aria-current={n === safePage ? 'page' : undefined}
                  className={`min-w-8 rounded-md border px-2 py-1 font-medium tabular-nums ${
                    n === safePage
                      ? 'border-[#0072CE] bg-[#0072CE] text-white'
                      : 'border-[#E2E8F0] text-[#172033] hover:bg-[#E8F4FC]'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="rounded-md border border-[#E2E8F0] px-3 py-1 font-medium text-[#172033] hover:bg-[#E8F4FC] disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </section>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Hapus inspeksi #${deleteTarget?.id ?? ''}?`}
        message={`Inspeksi #${deleteTarget?.id ?? ''} akan dihapus permanen, termasuk foto dan semua indikasinya. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}