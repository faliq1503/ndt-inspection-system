import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Loading from '../components/common/Loading';
import StatusBadge, { Badge } from '../components/common/StatusBadge';
import IndicationTable from '../components/inspection/IndicationTable';
import { inspectionService } from '../services/inspectionService';
import type { ComponentDetail, ResultRow, Standard } from '../types/index';
import { formatNumber } from '../utils/format';

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
  const d = new Date(iso);
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
  const adaTidakValid = angkaPenting.some((v) => v === null || v === undefined || (typeof v === 'number' && (Number.isNaN(v) || v < 0)));

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
      sebab.push(`Zona ${zona}: REJECT di luar batas persentase (aturan individual)`);
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
          lolos ? 'border-[#16A34A]/30 bg-[#16A34A]/[0.05]' : 'border-[#DC2626]/30 bg-[#DC2626]/[0.05]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#172033]">Zona {zona}</span>
          {status === 'ACCEPT' || status === 'REJECT' ? (
            <StatusBadge status={status} />
          ) : (
            <Badge tone="neutral" label="-" />
          )}
        </div>
        <p className="mt-1 text-lg font-bold tabular-nums text-[#172033]">
          {validNumber(persen) ? `${formatNumber(persen)}%` : '—'}
          <span className="ml-1 text-[13px] font-medium text-[#64748B]">
            / {toleransi !== null ? `≤ ${formatNumber(toleransi)}%` : '—'}
          </span>
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]" aria-hidden="true">
          <div
            className={`h-full rounded-full ${lolos ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}
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
            <Link to="/inspection/history" className="font-medium text-[#0072CE] hover:underline">
              Riwayat Inspeksi
            </Link>
            <span aria-hidden="true" className="mx-1.5 text-[#64748B]">/</span>
            <span className="text-[#64748B]">Detail #{result.id}</span>
          </nav>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold text-[#172033]">
            Detail Inspeksi #{result.id}
            <StatusBadge status={result.status} />
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDlError(null);
              inspectionService
                .downloadReportPdf(result.id)
                .catch((err: unknown) => setDlError(err instanceof Error ? err.message : 'Gagal mengunduh PDF.'));
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#005B9A]"
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
        <p role="alert" className="rounded-md bg-[#DC2626]/10 px-3 py-2 text-sm text-[#DC2626]">
          {dlError}
        </p>
      )}

      {/* 2. Banner ringkasan hasil */}
      <section
        aria-label="Ringkasan hasil"
        className={`rounded-lg border-l-4 p-4 ${
          ok ? 'border-[#16A34A] bg-[#16A34A]/[0.06]' : 'border-[#DC2626] bg-[#DC2626]/[0.06]'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span aria-hidden="true" className={`text-xl leading-none ${ok ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {ok ? '✓' : '⚠'}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[15px] font-bold ${ok ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
              {ok ? 'ACC — Memenuhi kriteria penerimaan' : 'REJECT — Melebihi batas toleransi'}
            </p>
            {!ok && sebab.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-[#172033]">
                {sebab.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
              <span className="tabular-nums text-[#172033]">
                % Unbound Zona A:{' '}
                <strong>{validNumber(result.persen_unbond_zone_a) ? `${formatNumber(result.persen_unbond_zone_a)}%` : '—'}</strong>
                <span className="text-[#64748B]"> / {toleransi !== null ? `≤ ${formatNumber(toleransi)}%` : '—'}</span>
              </span>
              <span className="tabular-nums text-[#172033]">
                % Unbound Zona C:{' '}
                <strong>{validNumber(result.persen_unbond_zone_c) ? `${formatNumber(result.persen_unbond_zone_c)}%` : '—'}</strong>
                <span className="text-[#64748B]"> / {toleransi !== null ? `≤ ${formatNumber(toleransi)}%` : '—'}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {adaTidakValid && (
        <p
          role="alert"
          title="Nilai tidak valid, periksa data indikasi"
          className="flex items-start gap-2 rounded-md border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-2 text-sm font-medium text-[#B45309]"
        >
          <span aria-hidden="true">⚠</span>
          Nilai tidak valid, periksa data indikasi.
        </p>
      )}

      {/* 3. Informasi inspeksi */}
      <section className="rounded-lg border border-[#E2E8F0] bg-white p-5" aria-label="Informasi inspeksi">
        <h2 className="text-[15px] font-semibold text-[#172033]">Informasi Inspeksi</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <dt className="text-xs text-[#64748B]">Komponen</dt>
            <dd className="mt-0.5 text-sm font-semibold capitalize text-[#172033]">{result.jenis_benda}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748B]">Diameter</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#172033]">
              {component ? `${formatNumber(component.diameter_mm)} mm` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748B]">Panjang</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#172033]">
              {component ? `${formatNumber(component.panjang_l_mm)} mm` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748B]">Lebar Zona A</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#172033]">
              {standard && validNumber(standard.lebar_zona_a_mm) ? `${formatNumber(standard.lebar_zona_a_mm)} mm` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748B]">Standar</dt>
            <dd className="mt-0.5 text-sm font-semibold text-[#172033]">{standard ? standard.nama_standard : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748B]">Upper/Lower</dt>
            <dd className="mt-0.5">
              {result.zona && result.zona.trim() ? (
                <Badge tone="neutral" label={result.zona} />
              ) : (
                <span className="text-sm text-[#64748B]">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748B]">Inspektur</dt>
            <dd className="mt-0.5 flex items-center gap-2">
              {inspector ? (
                <>
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8F4FC] text-xs font-bold text-[#0072CE]"
                  >
                    {initials(inspector)}
                  </span>
                  <span className="truncate text-sm font-semibold text-[#172033]">{inspector}</span>
                </>
              ) : (
                <span className="text-sm text-[#64748B]">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748B]">Tanggal Inspeksi</dt>
            <dd className="mt-0.5 text-sm font-semibold text-[#172033]">{date}</dd>
            {time && <dd className="text-xs text-[#64748B]">{time}</dd>}
          </div>
        </dl>
      </section>

      {/* 4. Dua kolom: gambar | evaluasi + perhitungan */}
      <div className="grid items-start gap-6 xl:grid-cols-5">
        <section
          ref={drawingRef}
          className="rounded-lg border border-[#E2E8F0] bg-white p-5 xl:col-span-3"
          aria-label="Gambar teknik"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[#172033]">Gambar Teknik</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-[#64748B]">
                <input
                  type="checkbox"
                  checked={showMarkers}
                  onChange={(e) => setShowMarkers(e.target.checked)}
                  className="h-4 w-4 accent-[#0072CE]"
                />
                Tampilkan marker
              </label>
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[13px] font-medium text-[#172033] hover:bg-[#E8F4FC]"
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
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]" aria-label="Legenda gambar">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="inline-block h-3 w-4 rounded-full border-2 border-[#DC2626] bg-[#DC2626]/25" />
                  Marker indikasi
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="inline-block h-3 w-4 rounded-full border-2 border-[#0072CE]" />
                  Terpilih
                </span>
                <span>Angka = nomor urut baris tabel</span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-[#64748B]">Gambar tidak tersedia.</p>
          )}
        </section>

        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-lg border border-[#E2E8F0] bg-white p-5" aria-label="Hasil evaluasi">
            <h2 className="text-[15px] font-semibold text-[#172033]">Hasil Evaluasi</h2>
            <div className="mt-3 space-y-3">
              {zoneCard('A', result.persen_unbond_zone_a, result.status_zone_a)}
              {zoneCard('C', result.persen_unbond_zone_c, result.status_zone_c)}
            </div>
            <p className={`mt-3 flex items-start gap-1.5 text-[13px] font-medium ${ok ? 'text-[#16A34A]' : 'text-[#B45309]'}`}>
              <span aria-hidden="true">{ok ? '✓' : '⚠'}</span>
              {ok
                ? 'Memenuhi kriteria penerimaan.'
                : 'Melebihi batas toleransi, status ditolak (REJECT).'}
            </p>
          </section>

          <section className="rounded-lg border border-[#E2E8F0] bg-white p-5" aria-label="Perhitungan">
            <h2 className="text-[15px] font-semibold text-[#172033]">Perhitungan</h2>
            <h3 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Geometri</h3>
            <dl className="divide-y divide-[#E2E8F0] text-sm">
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-[#64748B]">Keliling (P)</dt>
                <dd className="text-right font-medium tabular-nums text-[#172033]">{formatNumber(result.p_keliling)} mm</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-[#64748B]">Luas Babbit total</dt>
                <dd className="text-right font-medium tabular-nums text-[#172033]">{formatNumber(result.a_babbit)} mm²</dd>
              </div>
            </dl>
            <h3 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Per Zona</h3>
            <dl className="divide-y divide-[#E2E8F0] text-sm">
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-[#64748B]">Luas Zona A</dt>
                <dd className="text-right font-medium tabular-nums text-[#172033]">{formatNumber(result.a_zone_a)} mm²</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-[#64748B]">Luas Zona C</dt>
                <dd className="text-right font-medium tabular-nums text-[#172033]">{formatNumber(result.a_zone_c)} mm²</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-[#64748B]">Total Unbound Zona A</dt>
                <dd className="text-right font-medium tabular-nums text-[#172033]">{formatNumber(result.a_unbond_zone_a)} mm²</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-[#64748B]">Total Unbound Zona C</dt>
                <dd className="text-right font-medium tabular-nums text-[#172033]">{formatNumber(result.a_unbond_zone_c)} mm²</dd>
              </div>
            </dl>
            <h3 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Persentase</h3>
            <dl className="divide-y divide-[#E2E8F0] text-sm">
              {(
                [
                  ['% Unbound Zona A', result.persen_unbond_zone_a, result.status_zone_a],
                  ['% Unbound Zona C', result.persen_unbond_zone_c, result.status_zone_c],
                ] as Array<[string, number | null, 'ACCEPT' | 'REJECT' | null]>
              ).map(([label, persen, status]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-1.5">
                  <dt className="text-[#64748B]">{label}</dt>
                  <dd
                    className={`text-right text-base font-bold tabular-nums ${
                      status === 'REJECT' ? 'text-[#DC2626]' : status === 'ACCEPT' ? 'text-[#16A34A]' : 'text-[#172033]'
                    }`}
                  >
                    {validNumber(persen) ? `${formatNumber(persen)} %` : '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      {/* 5. Detail indikasi */}
      <section className="rounded-lg border border-[#E2E8F0] bg-white p-5" aria-label="Detail indikasi">
        <h2 className="text-[15px] font-semibold text-[#172033]">Detail Indikasi</h2>
        <div className="mt-2">
          <IndicationTable
            items={indications}
            selectedId={selectedId}
            onSelect={handleSelectRow}
            onEdit={() => undefined}
            hideActions
          />
        </div>
        {indications.length > 0 && (
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 border-t border-[#E2E8F0] pt-3 text-sm">
            <div className="flex gap-2">
              <dt className="text-[#64748B]">Jumlah indikasi</dt>
              <dd className="font-semibold tabular-nums text-[#172033]">{indications.length}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[#64748B]">Total unbound Zona A</dt>
              <dd className="font-semibold tabular-nums text-[#172033]">{formatNumber(result.a_unbond_zone_a)} mm²</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[#64748B]">Total unbound Zona C</dt>
              <dd className="font-semibold tabular-nums text-[#172033]">{formatNumber(result.a_unbond_zone_c)} mm²</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
