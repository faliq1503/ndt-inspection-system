import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Loading from '../components/common/Loading';
import CalculationSummary from '../components/inspection/CalculationSummary';
import EvaluationResultCard from '../components/inspection/EvaluationResultCard';
import IndicationTable from '../components/inspection/IndicationTable';
import { inspectionService } from '../services/inspectionService';
import type { ComponentDetail, ResultRow } from '../types/index';
import { formatDate, formatNumber } from '../utils/format';

/** Canvas yang sama dengan New Inspection, dipakai read-only (code-split). */
const MappingCanvas = lazy(() => import('../components/inspection/MappingCanvas'));

/**
 * Halaman /inspection/:id — :id adalah result id (evaluation_result.id).
 * Jika id adalah component id, halaman mencoba fallback ke hasil terbaru.
 */
export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = Number(id);
  const [result, setResult] = useState<ResultRow | null>(null);
  const [component, setComponent] = useState<ComponentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dlError, setDlError] = useState<string | null>(null);

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
          // Fallback: anggap :id sebagai component id.
          const byComp = rows.filter((r) => r.component_id === numericId);
          found = byComp.length > 0 ? byComp[0] : null;
        }
        if (!found) throw new Error('Hasil inspeksi tidak ditemukan.');
        setResult(found);
        const detail = await inspectionService.getComponent(found.component_id);
        setComponent(detail);
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

  if (loading) return <Loading label="Memuat detail inspeksi..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!result) return <EmptyState title="Hasil tidak ditemukan." />;

  const gambarUrl = inspectionService.imageUrl(component?.gambar_path ?? null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to="/inspection/history" className="text-sm font-medium text-[#0072CE] hover:underline">
            ← Kembali ke Riwayat
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Detail Inspeksi #{result.id}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setDlError(null);
            inspectionService
              .downloadReportPdf(result.id)
              .catch((err: unknown) => setDlError(err instanceof Error ? err.message : 'Gagal mengunduh PDF.'));
          }}
          className="rounded-md bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#005B9A]"
        >
          Ekspor PDF
        </button>
      </div>
      {dlError && (
        <p role="alert" className="rounded-md bg-[#DC2626]/10 px-3 py-2 text-sm text-[#DC2626]">
          {dlError}
        </p>
      )}

      <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
        <h2 className="text-[15px] font-semibold">Informasi Inspeksi</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 text-sm lg:grid-cols-3">
          {(
            [
              ['ID Inspeksi', `#${result.id}`],
              ['Komponen', result.jenis_benda],
              ['Diameter', `${formatNumber(result.diameter_mm)} mm`],
              ['Upper/Lower', result.zona],
              ['Tanggal', formatDate(component?.tanggal_input)],
              ['Inspektur', result.inspector ?? '-'],
            ] as Array<[string, string]>
          ).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-[#E2E8F0] py-1.5">
              <dt className="text-[#64748B]">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <h2 className="text-[15px] font-semibold">Gambar Teknik</h2>
          {gambarUrl && component ? (
            <div className="mt-2">
              <Suspense fallback={<Loading label="Memuat kanvas..." />}>
                <MappingCanvas
                  imageUrl={gambarUrl}
                  indications={component.indikasi_list}
                  selectedId={null}
                  onSelect={() => undefined}
                  onCanvasClick={() => undefined}
                  focusRequest={null}
                  readOnly
                />
              </Suspense>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#64748B]">Gambar tidak tersedia.</p>
          )}
        </section>
        <div className="space-y-4">
          <CalculationSummary result={result} />
          <EvaluationResultCard result={result} />
        </div>
      </div>

      <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
        <h2 className="text-[15px] font-semibold">Detail Indikasi</h2>
        <div className="mt-2">
          <IndicationTable
            items={component?.indikasi_list ?? []}
            selectedId={null}
            onSelect={() => undefined}
            onEdit={() => undefined}
          />
        </div>
      </section>
    </div>
  );
}
