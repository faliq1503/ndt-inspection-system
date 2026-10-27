import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import { useToast } from '../components/common/toastContext';
import Loading from '../components/common/Loading';
import PercentValue from '../components/common/PercentValue';
import StatusBadge from '../components/common/StatusBadge';
import { inspectionService } from '../services/inspectionService';
import type { EvaluationStatus, ResultRow } from '../types/index';
import { formatShortDate, parseDbDate } from '../utils/format';

const PAGE_SIZE = 10;

type SortKey = 'id' | 'tanggal' | 'komponen' | 'unit' | 'inspektur' | 'persenA' | 'persenC' | 'status';
type SortDir = 'asc' | 'desc';

/** Nilai pembanding per kolom; null selalu diletakkan di akhir. */
function sortValue(r: ResultRow, key: SortKey): string | number | null {
  switch (key) {
    case 'id':
      return r.nomor;
    case 'tanggal':
      return parseDbDate(r.tanggal_input)?.getTime() ?? null;
    case 'komponen':
      return r.jenis_benda?.toLowerCase() ?? null;
    case 'unit':
      return r.unit_asal?.toLowerCase() ?? null;
    case 'inspektur':
      return r.inspector?.toLowerCase() ?? null;
    case 'persenA':
      return r.persen_unbond_zone_a ?? null;
    case 'persenC':
      return r.persen_unbond_zone_c ?? null;
    case 'status':
      return r.status ?? null;
  }
}

/** "YYYY-MM-DD" waktu lokal, untuk dibandingkan dengan nilai <input type="date">. */
function localDateKey(value: string | null | undefined): string | null {
  const d = parseDbDate(value);
  if (!d) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`py-2 pr-4 font-medium ${align === 'right' ? 'text-right' : ''}`}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-ndt-text ${active ? 'text-ndt-text' : ''}`}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={active ? 'text-ndt-primary' : 'opacity-40'}>
          <path d="M5 1 8 4H2z" fill="currentColor" opacity={active && sort.dir === 'desc' ? 0.3 : 1} />
          <path d="M5 9 2 6h6z" fill="currentColor" opacity={active && sort.dir === 'asc' ? 0.3 : 1} />
        </svg>
      </button>
    </th>
  );
}

/** Tombol aksi baris: lihat, ekspor PDF, hapus (dipakai di tabel & kartu). */
function RowActions({
  r,
  downloadingId,
  onExportPdf,
  onDelete,
}: {
  r: ResultRow;
  downloadingId: number | null;
  onExportPdf: (id: number, nomor: number) => void;
  onDelete: (r: ResultRow) => void;
}) {
  return (
    <span className="flex items-center gap-1">
      <Link
        to={`/inspection/${r.id}`}
        title={`Detail inspeksi #${r.nomor}`}
        aria-label={`Detail inspeksi #${r.nomor}`}
        className="rounded-md p-1.5 text-ndt-primary hover:bg-ndt-primary-light"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </Link>
      <button
        type="button"
        onClick={() => onExportPdf(r.id, r.nomor)}
        disabled={downloadingId !== null}
        title={`Ekspor PDF inspeksi #${r.nomor}`}
        aria-label={`Ekspor PDF inspeksi #${r.nomor}`}
        className="rounded-md p-1.5 text-ndt-text hover:bg-ndt-primary-light hover:text-ndt-primary disabled:opacity-40"
      >
        {downloadingId === r.id ? (
          <span aria-hidden="true" className="block h-4 w-4 animate-spin rounded-full border-2 border-ndt-primary/30 border-t-ndt-primary" />
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
        onClick={() => onDelete(r)}
        title={`Hapus inspeksi #${r.nomor}`}
        aria-label={`Hapus inspeksi #${r.nomor}`}
        className="rounded-md p-1.5 text-ndt-muted hover:bg-ndt-danger/10 hover:text-ndt-danger"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </span>
  );
}

function FilterField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ndt-text">
        {label}
      </label>
      {children}
    </div>
  );
}

const CONTROL_CLASS =
  'h-[38px] w-full rounded-md border border-ndt-border bg-white px-3 text-sm text-ndt-text focus:border-ndt-primary focus:outline-none focus:ring-[3px] focus:ring-ndt-primary/15';

/** Halaman /inspection/history — tabel + search + filter + sort + pagination. */
export default function HistoryPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | EvaluationStatus>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'id', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResultRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

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

  const isFiltered = search.trim() !== '' || filter !== 'ALL' || dateFrom !== '' || dateTo !== '';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hasil = rows.filter((r) => {
      if (filter !== 'ALL' && r.status !== filter) return false;
      if (dateFrom || dateTo) {
        const key = localDateKey(r.tanggal_input);
        if (!key) return false;
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
      }
      if (!q) return true;
      return (
        String(r.nomor).includes(q) ||
        r.jenis_benda.toLowerCase().includes(q) ||
        r.zona.toLowerCase().includes(q) ||
        (r.unit_asal ?? '').toLowerCase().includes(q) ||
        (r.inspector ?? '').toLowerCase().includes(q)
      );
    });
    const arah = sort.dir === 'asc' ? 1 : -1;
    return [...hasil].sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      if (va === vb) return b.id - a.id;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va < vb ? -1 : 1) * arah;
    });
  }, [rows, search, filter, dateFrom, dateTo, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /** Nomor halaman aktual (jendela maks. 5 di sekitar halaman aktif). */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.min(Math.max(safePage - 2, 1), totalPages - 4);
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [totalPages, safePage]);

  function handleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'id' || key === 'tanggal' ? 'desc' : 'asc' }));
    setPage(1);
  }

  function resetFilters() {
    setSearch('');
    setFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  /** Hapus satu inspeksi via endpoint bulk yang sudah ada. */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDlError(null);
    try {
      await inspectionService.bulkDeleteResults([deleteTarget.id]);
      toast.success(`Inspeksi #${deleteTarget.nomor} berhasil dihapus.`);
      load();
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Gagal menghapus inspeksi.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  /** Export PDF backend (reportlab) untuk satu baris inspeksi. */
  async function handleExportPdf(resultId: number, nomor: number) {
    setDlError(null);
    setDownloadingId(resultId);
    try {
      await inspectionService.downloadReportPdf(resultId, nomor);
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Gagal mengunduh PDF.');
    } finally {
      setDownloadingId(null);
    }
  }

  /** Export Excel: kalau ada filter aktif, hanya baris yang sedang tampil (urutan sesuai tabel). */
  async function handleExportExcel() {
    setDlError(null);
    setExportingExcel(true);
    try {
      await inspectionService.downloadExcel(isFiltered ? filtered.map((r) => r.id) : undefined);
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Gagal mengunduh Excel.');
    } finally {
      setExportingExcel(false);
    }
  }

  if (loading) return <Loading label="Memuat riwayat inspeksi..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Riwayat Inspeksi</h1>
          <p className="text-sm text-ndt-muted">Lihat dan kelola inspeksi yang telah selesai</p>
        </div>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exportingExcel || filtered.length === 0}
          title={isFiltered ? 'Ekspor hanya data yang sesuai filter' : 'Ekspor semua riwayat'}
          className="inline-flex items-center gap-1.5 rounded-md border border-ndt-border bg-white px-3 py-2 text-sm font-medium text-ndt-text hover:bg-ndt-primary-light disabled:opacity-50"
        >
          {exportingExcel ? (
            <span aria-hidden="true" className="block h-[15px] w-[15px] animate-spin rounded-full border-2 border-ndt-primary/30 border-t-ndt-primary" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {isFiltered ? `Ekspor Excel (${filtered.length})` : 'Ekspor Excel'}
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-ndt-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_160px_160px_auto] lg:items-end">
        <div className="sm:col-span-2 lg:col-span-1">
          <Input
            label="Cari"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ID / Komponen / Unit / Inspektur..."
            leftIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.5" y2="16.5" />
              </svg>
            }
          />
        </div>
        <FilterField label="Hasil" htmlFor="result-filter">
          <select
            id="result-filter"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as 'ALL' | EvaluationStatus);
              setPage(1);
            }}
            className={CONTROL_CLASS}
          >
            <option value="ALL">Semua</option>
            <option value="ACCEPT">ACC</option>
            <option value="REJECT">REJECT</option>
          </select>
        </FilterField>
        <FilterField label="Dari Tanggal" htmlFor="date-from">
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className={CONTROL_CLASS}
          />
        </FilterField>
        <FilterField label="Sampai Tanggal" htmlFor="date-to">
          <input
            id="date-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className={CONTROL_CLASS}
          />
        </FilterField>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!isFiltered}
          className="h-[38px] rounded-md border border-ndt-border bg-white px-3 text-sm font-medium text-ndt-text hover:bg-ndt-primary-light disabled:opacity-40 sm:col-span-2 lg:col-span-1"
        >
          Atur Ulang
        </button>
      </div>

      {dlError && (
        <p role="alert" className="rounded-md bg-ndt-danger/10 px-3 py-2 text-sm text-ndt-danger">
          {dlError}
        </p>
      )}

      {filtered.length === 0 ? (
        rows.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat inspeksi."
            action={
              <Link
                to="/inspection/new"
                className="rounded-md bg-ndt-primary px-4 py-2 text-sm font-medium text-white hover:bg-ndt-primary-dark"
              >
                + Inspeksi Baru
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="Tidak ada hasil yang cocok dengan pencarian atau filter."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-md border border-ndt-border bg-white px-4 py-2 text-sm font-medium text-ndt-text hover:bg-ndt-primary-light"
              >
                Atur Ulang Filter
              </button>
            }
          />
        )
      ) : (
        <section className="rounded-lg border border-ndt-border bg-white p-4">
          {/* Tabel: tablet & desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full whitespace-nowrap text-left text-[13px]">
              <thead>
                <tr className="border-b border-ndt-border text-xs text-ndt-muted">
                  <SortHeader label="ID" sortKey="id" sort={sort} onSort={handleSort} />
                  <SortHeader label="Tanggal" sortKey="tanggal" sort={sort} onSort={handleSort} />
                  <SortHeader label="Komponen" sortKey="komponen" sort={sort} onSort={handleSort} />
                  <SortHeader label="Unit Asal" sortKey="unit" sort={sort} onSort={handleSort} />
                  <SortHeader label="Inspektur" sortKey="inspektur" sort={sort} onSort={handleSort} />
                  <SortHeader label="% Unbond A" sortKey="persenA" sort={sort} onSort={handleSort} align="right" />
                  <SortHeader label="% Unbond C" sortKey="persenC" sort={sort} onSort={handleSort} align="right" />
                  <SortHeader label="Hasil" sortKey="status" sort={sort} onSort={handleSort} />
                  <th className="py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-ndt-border last:border-0 hover:bg-ndt-primary-light/60">
                    <td className="py-2 pr-4 font-semibold text-ndt-primary">
                      <Link to={`/inspection/${r.id}`} className="hover:underline">
                        #{r.nomor}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{formatShortDate(r.tanggal_input)}</td>
                    <td className="py-2 pr-4">
                      <span className="capitalize">{r.jenis_benda}</span>
                      {r.zona && r.zona.trim() && <span className="ml-1.5 text-ndt-muted">· {r.zona}</span>}
                    </td>
                    <td className="max-w-[180px] truncate py-2 pr-4" title={r.unit_asal ?? undefined}>
                      {r.unit_asal || '-'}
                    </td>
                    <td className="py-2 pr-4">{r.inspector ?? '-'}</td>
                    <td className="py-2 pr-4 text-right">
                      <PercentValue value={r.persen_unbond_zone_a} />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <PercentValue value={r.persen_unbond_zone_c} />
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-1">
                      <RowActions r={r} downloadingId={downloadingId} onExportPdf={handleExportPdf} onDelete={setDeleteTarget} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu: layar kecil */}
          <div className="md:hidden">
            <label htmlFor="mobile-sort" className="sr-only">
              Urutkan
            </label>
            <select
              id="mobile-sort"
              value={`${sort.key}:${sort.dir}`}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(':') as [SortKey, SortDir];
                setSort({ key, dir });
                setPage(1);
              }}
              className={`${CONTROL_CLASS} mb-3`}
            >
              <option value="id:desc">Urutkan: Terbaru</option>
              <option value="id:asc">Urutkan: Terlama</option>
              <option value="persenC:desc">Urutkan: % Unbond C tertinggi</option>
              <option value="persenA:desc">Urutkan: % Unbond A tertinggi</option>
              <option value="komponen:asc">Urutkan: Komponen (A-Z)</option>
              <option value="unit:asc">Urutkan: Unit Asal (A-Z)</option>
            </select>
            <ul className="space-y-3">
              {pageRows.map((r) => (
                <li key={r.id} className="rounded-lg border border-ndt-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/inspection/${r.id}`} className="font-semibold text-ndt-primary">
                        #{r.nomor} · <span className="capitalize">{r.jenis_benda}</span>
                      </Link>
                      <p className="truncate text-xs text-ndt-muted">
                        {formatShortDate(r.tanggal_input)} · {r.zona || '-'} · {r.unit_asal || '-'}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-ndt-muted">% Unbond A</dt>
                      <dd className="text-[13px] font-medium">
                        <PercentValue value={r.persen_unbond_zone_a} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ndt-muted">% Unbond C</dt>
                      <dd className="text-[13px] font-medium">
                        <PercentValue value={r.persen_unbond_zone_c} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ndt-muted">Inspektur</dt>
                      <dd className="truncate text-[13px] font-medium">{r.inspector ?? '-'}</dd>
                    </div>
                  </dl>
                  <div className="mt-2 flex justify-end border-t border-ndt-border pt-2">
                    <RowActions r={r} downloadingId={downloadingId} onExportPdf={handleExportPdf} onDelete={setDeleteTarget} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ndt-muted">
            <span className="tabular-nums">
              {isFiltered ? `${filtered.length} dari ${rows.length} inspeksi` : `${rows.length} inspeksi`}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                aria-label="Halaman sebelumnya"
                className="rounded-md border border-ndt-border px-3 py-1 font-medium text-ndt-text hover:bg-ndt-primary-light disabled:opacity-40"
              >
                <span className="sm:hidden">‹</span>
                <span className="hidden sm:inline">Sebelumnya</span>
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
                      ? 'border-ndt-primary bg-ndt-primary text-white'
                      : 'border-ndt-border text-ndt-text hover:bg-ndt-primary-light'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                aria-label="Halaman berikutnya"
                className="rounded-md border border-ndt-border px-3 py-1 font-medium text-ndt-text hover:bg-ndt-primary-light disabled:opacity-40"
              >
                <span className="sm:hidden">›</span>
                <span className="hidden sm:inline">Berikutnya</span>
              </button>
            </div>
          </div>
        </section>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Hapus inspeksi #${deleteTarget?.nomor ?? ''}?`}
        message={`Inspeksi #${deleteTarget?.nomor ?? ''} akan dihapus permanen, termasuk foto dan semua indikasinya. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
