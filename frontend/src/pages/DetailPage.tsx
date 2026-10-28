import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Loading from '../components/common/Loading';
import StatusBadge, { Badge } from '../components/common/StatusBadge';
import IndicationTable from '../components/inspection/IndicationTable';
import Modal from '../components/common/Modal';
import CriteriaComparison from '../components/inspection/CriteriaComparison';
import IndicationTotals from '../components/inspection/IndicationTotals';
import { inspectionService } from '../services/inspectionService';
import type { ComponentDetail, ResultRow, Standard } from '../types/index';
import { formatNumber, isPercentAbnormal } from '../utils/format';

/** Canvas yang sama dengan New Inspection, dipakai read-only (code-split). */
const MappingCanvas = lazy(() => import('../components/inspection/MappingCanvas'));

function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '-';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function validNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function splitDateTime(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '-', time: '' };
  // SQLite CURRENT_TIMESTAMP = UTC tanpa penanda zona ("2026-10-13 12:37:00").
  // Tanpa 'Z', browser menganggapnya waktu lokal sehingga jamnya meleset 7 jam.
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso);
  const d = new Date(hasZone ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' };
  return {
    date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Halaman /inspection/:id — :id adalah result id (evaluation_result.id).
 * Semua angka & status berasal dari backend apa adanya.
 */
export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = Number(id);
  const [result, setResult] = useState<ResultRow | null>(null);
  const [component, setComponent] = useState<ComponentDetail | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dlError, setDlError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focusReq, setFocusReq] = useState<{ id: number; nonce: number } | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buktiView, setBuktiView] = useState<{ url: string; nomor: number } | null>(null);
  const drawingRef = useRef<HTMLElement>(null);

  function load() {
    if (!Number.isInteger(numericId)) {
      setError('ID inspeksi tidak valid.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    inspectionService
      .listResults()
      .then(async (rows) => {
        let found = rows.find((r) => r.id === numericId) ?? null;
        if (!found) {
          const byComp = rows.filter((r) => r.component_id === numericId);
          found = byComp.length > 0 ? byComp[0] : null;
        }
        if (!found) throw new Error('Hasil inspeksi tidak ditemukan.');
        setResult(found);
        const [detail, stds] = await Promise.all([
          inspectionService.getComponent(found.component_id),
          inspectionService.listStandards().catch(() => [] as Standard[]),
        ]);
        setComponent(detail);
        setStandards(stds);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat detail.');
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement !== null);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function toggleFullscreen() {
    const el = drawingRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void el.requestFullscreen?.().catch(() => undefined);
    }
  }

  if (loading) return <Loading label="Memuat detail inspeksi..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!result) return <EmptyState title="Hasil tidak ditemukan." />;

  const gambarUrl = inspectionService.imageUrl(component?.gambar_path ?? null);
  const standard = standards.find((s) => s.id === component?.standard_id) ?? null;
  const toleransi = standard && validNumber(standard.toleransi_persen) ? standard.toleransi_persen : null;
  const ok = result.status === 'ACCEPT';
  const inspector = result.inspector ?? component?.inspector ?? null;
  const { date, time } = splitDateTime(component?.tanggal_input);
  const indications = component?.indikasi_list ?? [];

  // Peringatan data tidak valid — murni dari angka aktual, tanpa rumus baru
  const angkaPenting = [
    result.p_keliling, result.a_babbit, result.a_zone_a, result.a_zone_c,
    result.a_unbond_zone_a, result.a_unbond_zone_c, result.a_bond_zone_a, result.a_bond_zone_c,
    result.persen_unbond_zone_a, result.persen_unbond_zone_c,
  ];
  const adaTidakValid =
    angkaPenting.some((v) => v === null || v === undefined || (typeof v === 'number' && (Number.isNaN(v) || v < 0))) ||
    isPercentAbnormal(result.persen_unbond_zone_a) ||
    isPercentAbnormal(result.persen_unbond_zone_c);

  // Penyebab REJECT per zona dari data aktual (tanpa menebak aturan individual)
  const sebab: string[] = [];
  (
    [
      ['A', result.status_zone_a, result.persen_unbond_zone_a],
      ['C', result.status_zone_c, result.persen_unbond_zone_c],
    ] as const
  ).forEach(([zona, status, persen]) => {
    if (status !== 'REJECT') return;
    if (validNumber(persen) && toleransi !== null && persen > toleransi) {
      sebab.push(`Zona ${zona}: ${formatNumber(persen)}% melebihi ≤ ${formatNumber(toleransi)}%`);
    } else if (validNumber(persen) && toleransi !== null) {
      sebab.push(`Zona ${zona}: REJECT karena batas indikasi individual, lihat tabel "Perbandingan dengan Standar"`);
    } else {
      sebab.push(`Zona ${zona}: REJECT`);
    }
  });

  function zoneCard(zona: 'A' | 'C', persen: number | null, status: 'ACCEPT' | 'REJECT' | null) {
    const lolos = status === 'ACCEPT';
    const bar = toleransi !== null && toleransi > 0 && validNumber(persen)
      ? Math.min(100, (persen / toleransi) * 100)
      : 0;
    return (
      <div
        className={`rounded-lg border p-3 ${
          lolos ? 'border-ndt-success/30 bg-ndt-success/[0.05]' : 'border-ndt-danger/30 bg-ndt-danger/[0.05]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ndt-text">Zona {zona}</span>
          {status === 'ACCEPT' || status === 'REJECT' ? (
            <StatusBadge status={status} />
          ) : (
            <Badge tone="neutral" label="-" />
          )}
        </div>
        <p className="mt-1 text-lg font-bold tabular-nums text-ndt-text">
          {validNumber(persen) ? `${formatNumber(persen)}%` : '—'}
          <span className="ml-1 text-[13px] font-medium text-ndt-muted">
            / {toleransi !== null ? `≤ ${formatNumber(toleransi)}%` : '—'}
          </span>
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ndt-border" aria-hidden="true">
          <div
            className={`h-full rounded-full ${lolos ? 'bg-ndt-success' : 'bg-ndt-danger'}`}
            style={{ width: `${bar}%` }}
          />
        </div>
      </div>
    );
  }

  function handleSelectRow(rowId: number) {
    setSelectedId(rowId);
    setFocusReq((prev) => ({ id: rowId, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  return (
    <div className="space-y-6">
      {/* 1. Header + breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="text-[13px]" aria-label="Breadcrumb">
            <Link to="/inspection/history" className="font-medium text-ndt-primary hover:underline">
              Riwayat Inspeksi
            </Link>
            <span aria-hidden="true" className="mx-1.5 text-ndt-muted">/</span>
            <span className="text-ndt-muted">Detail #{result.nomor}</span>
          </nav>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold text-ndt-text">
            Detail Inspeksi #{result.nomor}
            <StatusBadge status={result.status} />
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDlError(null);
              inspectionService
                .downloadReportPdf(result.id, result.nomor)
                .catch((err: unknown) => setDlError(err instanceof Error ? err.message : 'Gagal mengunduh PDF.'));
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-ndt-primary px-4 py-2 text-sm font-medium text-white hover:bg-ndt-primary-dark"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Ekspor PDF
          </button>
        </div>
      </div>
      {dlError && (
        <p role="alert" className="rounded-md bg-ndt-danger/10 px-3 py-2 text-sm text-ndt-danger">
          {dlError}
        </p>
      )}

      {/* 2. Banner ringkasan hasil */}
      <section
        aria-label="Ringkasan hasil"
        className={`rounded-lg border-l-4 p-4 ${
          ok ? 'border-ndt-success bg-ndt-success/[0.06]' : 'border-ndt-danger bg-ndt-danger/[0.06]'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span aria-hidden="true" className={`text-xl leading-none ${ok ? 'text-ndt-success' : 'text-ndt-danger'}`}>
            {ok ? '✓' : '⚠'}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[15px] font-bold ${ok ? 'text-ndt-success' : 'text-ndt-danger'}`}>
              {ok ? 'ACC — Memenuhi kriteria penerimaan' : 'REJECT — Melebihi batas toleransi'}
            </p>
            {!ok && sebab.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ndt-text">
                {sebab.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
              <span className="tabular-nums text-ndt-text">
                % Unbond Zona A:{' '}
                <strong>{validNumber(result.persen_unbond_zone_a) ? `${formatNumber(result.persen_unbond_zone_a)}%` : '—'}</strong>
                <span className="text-ndt-muted"> / {toleransi !== null ? `≤ ${formatNumber(toleransi)}%` : '—'}</span>
              </span>
              <span className="tabular-nums text-ndt-text">
                % Unbond Zona C:{' '}
                <strong>{validNumber(result.persen_unbond_zone_c) ? `${formatNumber(result.persen_unbond_zone_c)}%` : '—'}</strong>
                <span className="text-ndt-muted"> / {toleransi !== null ? `≤ ${formatNumber(toleransi)}%` : '—'}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {adaTidakValid && (
        <p
          role="alert"
          title="Nilai tidak valid, periksa data indikasi"
          className="flex items-start gap-2 rounded-md border border-ndt-warning/40 bg-ndt-warning/10 px-3 py-2 text-sm font-medium text-ndt-warning-dark"
        >
          <span aria-hidden="true">⚠</span>
          Nilai tidak valid, periksa data indikasi.
        </p>
      )}

      {/* 3. Informasi inspeksi */}
      <section className="rounded-lg border border-ndt-border bg-white p-5" aria-label="Informasi inspeksi">
        <h2 className="text-[15px] font-semibold text-ndt-text">Informasi Inspeksi</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <dt className="text-xs text-ndt-muted">Komponen</dt>
            <dd className="mt-0.5 text-sm font-semibold capitalize text-ndt-text">{result.jenis_benda}</dd>
          </div>
          <div>
            <dt className="text-xs text-ndt-muted">Diameter</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ndt-text">
              {component && component.diameter_mm > 0 ? `${formatNumber(component.diameter_mm)} mm` : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ndt-muted">Lebar (L)</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ndt-text">
              {component ? `${formatNumber(component.panjang_l_mm)} mm` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ndt-muted">Lebar Zona A</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ndt-text">
              {validNumber(component?.lebar_zona_a_mm)
                ? `${formatNumber(component!.lebar_zona_a_mm as number)} mm`
                : standard && validNumber(standard.lebar_zona_a_mm)
                  ? `${formatNumber(standard.lebar_zona_a_mm)} mm`
                  : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ndt-muted">Unit Asal</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ndt-text">{component?.unit_asal || '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ndt-muted">Standar</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ndt-text">{standard ? standard.nama_standard : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ndt-muted">Upper/Lower</dt>
            <dd className="mt-0.5">
              {result.zona && result.zona.trim() ? (
                <Badge tone="neutral" label={result.zona} />
              ) : (
                <span className="text-sm text-ndt-muted">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ndt-muted">Inspektur</dt>
            <dd className="mt-0.5 flex items-center gap-2">
              {inspector ? (
                <>
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ndt-primary-light text-xs font-bold text-ndt-primary"
                  >
                    {initials(inspector)}
                  </span>
                  <span className="truncate text-sm font-semibold text-ndt-text">{inspector}</span>
                </>
              ) : (
                <span className="text-sm text-ndt-muted">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ndt-muted">Tanggal Inspeksi</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ndt-text">{date}</dd>
            {time && <dd className="text-xs text-ndt-muted">{time}</dd>}
          </div>
        </dl>
      </section>

      {/* 4. Dua kolom: gambar | hasil evaluasi + perbandingan standar, lalu perhitungan selebar penuh */}
      <div className="grid items-start gap-6 xl:grid-cols-5">
        <section
          ref={drawingRef}
          className="min-w-0 rounded-lg border border-ndt-border bg-white p-5 xl:col-span-3"
          aria-label="Gambar teknik"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ndt-text">Gambar Teknik</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-ndt-muted">
                <input
                  type="checkbox"
                  checked={showMarkers}
                  onChange={(e) => setShowMarkers(e.target.checked)}
                  className="h-4 w-4 accent-ndt-primary"
                />
                Tampilkan marker
              </label>
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
                className="inline-flex items-center gap-1.5 rounded-md border border-ndt-border bg-white px-2.5 py-1 text-[13px] font-medium text-ndt-text hover:bg-ndt-primary-light"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
                {isFullscreen ? 'Keluar' : 'Penuh'}
              </button>
            </div>
          </div>
          {gambarUrl && component ? (
            <>
              <div className="mt-3">
                <Suspense fallback={<Loading label="Memuat kanvas..." />}>
                  <MappingCanvas
                    imageUrl={gambarUrl}
                    indications={indications}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onCanvasClick={() => undefined}
                    focusRequest={focusReq}
                    readOnly
                    showMarkers={showMarkers}
                  />
                </Suspense>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ndt-muted" aria-label="Legenda gambar">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="inline-block h-3 w-4 rounded-full border-2 border-ndt-danger bg-ndt-danger/25" />
                  Marker indikasi
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="inline-block h-3 w-4 rounded-full border-2 border-ndt-primary" />
                  Terpilih
                </span>
                <span>Angka = nomor urut baris tabel</span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-ndt-muted">Gambar tidak tersedia.</p>
          )}
        </section>

        <div className="min-w-0 space-y-6 xl:col-span-2">
          <section className="rounded-lg border border-ndt-border bg-white p-5" aria-label="Hasil evaluasi">
            <h2 className="text-[15px] font-semibold text-ndt-text">Hasil Evaluasi</h2>
            <div className="mt-3 space-y-3">
              {zoneCard('A', result.persen_unbond_zone_a, result.status_zone_a)}
              {zoneCard('C', result.persen_unbond_zone_c, result.status_zone_c)}
            </div>
            <p className={`mt-3 flex items-start gap-1.5 text-[13px] font-medium ${ok ? 'text-ndt-success' : 'text-ndt-warning-dark'}`}>
              <span aria-hidden="true">{ok ? '✓' : '⚠'}</span>
              {ok
                ? 'Memenuhi kriteria penerimaan.'
                : 'Melebihi batas toleransi, status ditolak (REJECT).'}
            </p>
          </section>

          <CriteriaComparison result={result} />
        </div>
      </div>

      <section className="rounded-lg border border-ndt-border bg-white p-5" aria-label="Perhitungan">
        <h2 className="text-[15px] font-semibold text-ndt-text">Perhitungan</h2>
        <div className="mt-3 grid gap-x-8 gap-y-4 md:grid-cols-3">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ndt-muted">Geometri</h3>
            <dl className="divide-y divide-ndt-border text-sm">
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-ndt-muted">Panjang (P)</dt>
                <dd className="text-right font-medium tabular-nums text-ndt-text">{formatNumber(result.p_keliling)} mm</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-ndt-muted">Luas Babbit total</dt>
                <dd className="text-right font-medium tabular-nums text-ndt-text">{formatNumber(result.a_babbit)} mm²</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ndt-muted">Per Zona</h3>
            <dl className="divide-y divide-ndt-border text-sm">
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-ndt-muted">Luas Zona A</dt>
                <dd className="text-right font-medium tabular-nums text-ndt-text">{formatNumber(result.a_zone_a)} mm²</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-ndt-muted">Luas Zona C</dt>
                <dd className="text-right font-medium tabular-nums text-ndt-text">{formatNumber(result.a_zone_c)} mm²</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-ndt-muted">Total Unbond Zona A</dt>
                <dd className="text-right font-medium tabular-nums text-ndt-text">{formatNumber(result.a_unbond_zone_a)} mm²</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-ndt-muted">Total Unbond Zona C</dt>
                <dd className="text-right font-medium tabular-nums text-ndt-text">{formatNumber(result.a_unbond_zone_c)} mm²</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ndt-muted">Persentase</h3>
            <dl className="divide-y divide-ndt-border text-sm">
              {(
                [
                  ['% Unbond Zona A', result.persen_unbond_zone_a, result.status_zone_a],
                  ['% Unbond Zona C', result.persen_unbond_zone_c, result.status_zone_c],
                ] as Array<[string, number | null, 'ACCEPT' | 'REJECT' | null]>
              ).map(([label, persen, status]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-1.5">
                  <dt className="text-ndt-muted">{label}</dt>
                  <dd
                    className={`text-right text-base font-bold tabular-nums ${
                      status === 'REJECT' ? 'text-ndt-danger' : status === 'ACCEPT' ? 'text-ndt-success' : 'text-ndt-text'
                    }`}
                  >
                    {validNumber(persen) ? `${formatNumber(persen)} %` : '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 5. Detail indikasi */}
      <section className="rounded-lg border border-ndt-border bg-white p-5" aria-label="Detail indikasi">
        <h2 className="text-[15px] font-semibold text-ndt-text">Detail Indikasi</h2>
        <div className="mt-2">
          <IndicationTable
            items={indications}
            selectedId={selectedId}
            onSelect={handleSelectRow}
            onEdit={() => undefined}
            hideActions
            onViewBukti={(ind) => {
              const url = ind.bukti_path ? inspectionService.imageUrl(ind.bukti_path) : null;
              if (!url) return;
              const nomor = indications.findIndex((x) => x.id === ind.id) + 1;
              setBuktiView({ url, nomor });
            }}
          />
        </div>
        <IndicationTotals result={result} indications={indications} />
      </section>

      {buktiView && (
        <Modal
          title={`Foto Bukti — Indikasi #${buktiView.nomor}`}
          onClose={() => setBuktiView(null)}
        >
          <img
            src={buktiView.url}
            alt={`Foto bukti indikasi #${buktiView.nomor}`}
            className="max-h-[60vh] w-full rounded-lg border border-ndt-border object-contain"
          />
        </Modal>
      )}
    </div>
  );
}
