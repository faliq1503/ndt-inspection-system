import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import CalculationSummary from '../components/inspection/CalculationSummary';
import EvaluationResultCard from '../components/inspection/EvaluationResultCard';
import IndicationTable from '../components/inspection/IndicationTable';
import { inspectionService } from '../services/inspectionService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearIndications, selectIndication, setIndications } from '../store/slices/indicationSlice';
import { resetWorkspace, setComponentId, setForm, setResult } from '../store/slices/inspectionSlice';
import type { ComponentDetail, Standard, Zone } from '../types/index';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_SIZE_MB = 10;

/**
 * Halaman /inspection/new — workspace input, drawing, indikasi,
 * kalkulasi (via backend), dan evaluasi.
 */
export default function NewInspectionPage() {
  const dispatch = useAppDispatch();
  const form = useAppSelector((s) => s.inspection.form);
  const componentId = useAppSelector((s) => s.inspection.componentId);
  const result = useAppSelector((s) => s.inspection.result);
  const indications = useAppSelector((s) => s.indication.items);
  const selectedId = useAppSelector((s) => s.indication.selectedId);

  const [standards, setStandards] = useState<Standard[]>([]);
  const [standardsLoading, setStandardsLoading] = useState(true);
  const [standardsError, setStandardsError] = useState<string | null>(null);

  const [component, setComponent] = useState<ComponentDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form tambah indikasi (modal sederhana — spec §13)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [newZona, setNewZona] = useState<Zone>('C');
  const [newPanjang, setNewPanjang] = useState('');
  const [newLebar, setNewLebar] = useState('');

  const imgRef = useRef<HTMLImageElement>(null);

  function loadStandards() {
    setStandardsLoading(true);
    setStandardsError(null);
    inspectionService
      .listStandards()
      .then((data) => {
        setStandards(data);
        setStandardsLoading(false);
      })
      .catch((err: unknown) => {
        setStandardsError(err instanceof Error ? err.message : 'Gagal memuat standard.');
        setStandardsLoading(false);
      });
  }

  useEffect(() => {
    loadStandards();
  }, []);

  async function refreshComponent(id: number) {
    const detail = await inspectionService.getComponent(id);
    setComponent(detail);
    dispatch(setIndications(detail.indikasi_list));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const diameter = parseFloat(form.diameterMm);
    const panjang = parseFloat(form.panjangLMm);
    if (!form.jenisBenda.trim() || Number.isNaN(diameter) || Number.isNaN(panjang) || form.standardId === '') {
      setError('Component, Diameter, Length, dan Standard wajib diisi dengan benar.');
      return;
    }
    setBusy(true);
    try {
      const created = await inspectionService.createComponent({
        jenis_benda: form.jenisBenda.trim(),
        diameter_mm: diameter,
        panjang_l_mm: panjang,
        zona: form.zona.trim(),
        standard_id: form.standardId,
      });
      dispatch(setComponentId(created.id));
      dispatch(setResult(null));
      dispatch(clearIndications());
      await refreshComponent(created.id);
      setNotice(`Komponen #${created.id} dibuat. Lanjut upload drawing.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat komponen.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || componentId === null) return;
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format file harus PNG atau JPG/JPEG.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${MAX_SIZE_MB} MB.`);
      return;
    }
    setBusy(true);
    try {
      await inspectionService.uploadImage(componentId, file);
      await refreshComponent(componentId);
      setNotice('Drawing berhasil diupload.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal upload drawing.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  function handleClickImage(e: MouseEvent<HTMLImageElement>) {
    if (!imgRef.current || componentId === null) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPos({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  }

  async function handleAddIndication() {
    if (componentId === null || pendingPos === null) return;
    const panjang = parseFloat(newPanjang);
    const lebar = parseFloat(newLebar);
    if (Number.isNaN(panjang) || Number.isNaN(lebar) || panjang <= 0 || lebar <= 0) {
      setError('Length dan Width harus angka positif (mm).');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await inspectionService.addIndication(componentId, {
        zona: newZona,
        panjang_mm: panjang,
        lebar_mm: lebar,
        posisi_x: pendingPos.x,
        posisi_y: pendingPos.y,
      });
      await refreshComponent(componentId);
      setPendingPos(null);
      setNewPanjang('');
      setNewLebar('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah indikasi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCalculate() {
    if (componentId === null) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const hasil = await inspectionService.calculate(componentId);
      dispatch(setResult(hasil));
      await refreshComponent(componentId);
      setNotice('Inspection saved successfully. Hasil dihitung oleh backend.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghitung.');
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    dispatch(resetWorkspace());
    dispatch(clearIndications());
    setComponent(null);
    setPendingPos(null);
    setError(null);
    setNotice(null);
  }

  const gambarUrl = inspectionService.imageUrl(component?.gambar_path ?? null);
  const activeStandard = standards.find((s) => s.id === form.standardId);

  if (standardsLoading) return <Loading label="Memuat standard..." />;
  if (standardsError) return <ErrorState message={standardsError} onRetry={loadStandards} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New Inspection</h1>
          <p className="text-sm text-[#64748B]">Input, mapping, calculation, dan evaluation</p>
        </div>
        {componentId !== null && (
          <Button variant="secondary" onClick={handleReset}>
            Cancel
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-[#DC2626]/10 px-3 py-2 text-sm text-[#DC2626]">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-md bg-[#16A34A]/10 px-3 py-2 text-sm text-[#16A34A]">
          {notice}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        {/* Kolom kiri: form + calculation */}
        <div className="space-y-4">
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-lg border border-[#E2E8F0] bg-white p-4"
          >
            <h2 className="text-[15px] font-semibold">Inspection Data</h2>
            <Input
              label="Component / Object Type"
              value={form.jenisBenda}
              onChange={(e) => dispatch(setForm({ jenisBenda: e.target.value }))}
              placeholder="mis. Bearing"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Diameter (mm)"
                type="number"
                step="any"
                value={form.diameterMm}
                onChange={(e) => dispatch(setForm({ diameterMm: e.target.value }))}
                placeholder="360"
              />
              <Input
                label="Length (mm)"
                type="number"
                step="any"
                value={form.panjangLMm}
                onChange={(e) => dispatch(setForm({ panjangLMm: e.target.value }))}
                placeholder="101"
              />
            </div>
            <Input
              label="Inspection Zone"
              value={form.zona}
              onChange={(e) => dispatch(setForm({ zona: e.target.value }))}
              placeholder="mis. Zone C"
            />
            <Input
              label="Inspector"
              value={form.inspector}
              onChange={(e) => dispatch(setForm({ inspector: e.target.value }))}
              hint="Placeholder — backend belum menyimpan inspector."
            />
            <div>
              <label htmlFor="standard" className="mb-1 block text-[13px] font-medium">
                Standard
              </label>
              <select
                id="standard"
                value={form.standardId}
                onChange={(e) =>
                  dispatch(setForm({ standardId: e.target.value === '' ? '' : Number(e.target.value) }))
                }
                className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#0072CE] focus:outline-none"
              >
                <option value="">-- Pilih standard --</option>
                {standards.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_standard} (toleransi {s.toleransi_persen}%)
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" loading={busy} className="w-full">
              {componentId === null ? 'Create Inspection' : 'Update & Recreate'}
            </Button>
          </form>

          {result && (
            <>
              <CalculationSummary result={result} standard={activeStandard} />
              <EvaluationResultCard result={result} />
              <div className="flex gap-2">
                <Link
                  to="/inspection/history"
                  className="flex-1 rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-center text-sm font-medium hover:bg-[#F5F7FA]"
                >
                  View History
                </Link>
                <Button variant="secondary" onClick={handleReset} className="flex-1">
                  Save & New
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Kolom kanan: drawing + indikasi */}
        <div className="space-y-4">
          <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
            <h2 className="text-[15px] font-semibold">2D Inspection Mapping</h2>
            {componentId === null ? (
              <p className="mt-2 text-sm text-[#64748B]">
                Buat inspection terlebih dahulu, lalu upload drawing di sini.
              </p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-md border border-[#E2E8F0] px-3 py-1.5 text-sm font-medium hover:bg-[#F5F7FA]">
                    {gambarUrl ? 'Replace image' : 'Upload image (PNG/JPG)'}
                    <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} className="hidden" />
                  </label>
                  {gambarUrl && <span className="text-xs text-[#64748B]">Klik drawing untuk Add Indication.</span>}
                </div>
                {gambarUrl ? (
                  <div className="relative mt-3 inline-block max-w-full overflow-hidden rounded-md border border-[#E2E8F0]">
                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                    <img
                      ref={imgRef}
                      src={gambarUrl}
                      alt="Technical drawing"
                      onClick={handleClickImage}
                      className="block max-h-[520px] w-auto cursor-crosshair"
                    />
                    {indications.map((ind, i) =>
                      ind.posisi_x !== null && ind.posisi_y !== null ? (
                        <button
                          key={ind.id}
                          type="button"
                          title={`Indikasi ${i + 1} — Zone ${ind.zona}`}
                          onClick={() => dispatch(selectIndication(ind.id))}
                          className={`absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white ${
                            selectedId === ind.id ? 'bg-[#0072CE]' : 'bg-[#DC2626]'
                          }`}
                          style={{ left: `${ind.posisi_x}%`, top: `${ind.posisi_y}%` }}
                        >
                          {i + 1}
                        </button>
                      ) : null,
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#64748B]">Belum ada drawing. Upload PNG/JPG untuk mulai mapping.</p>
                )}
              </>
            )}
          </section>

          {pendingPos && (
            <section className="rounded-lg border border-[#0072CE]/40 bg-white p-4" aria-label="Add Indication">
              <h3 className="text-[15px] font-semibold">Add Indication</h3>
              <p className="text-xs text-[#64748B]">
                Coordinate X: {pendingPos.x} — Y: {pendingPos.y}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="zona" className="mb-1 block text-[13px] font-medium">
                    Zone
                  </label>
                  <select
                    id="zona"
                    value={newZona}
                    onChange={(e) => setNewZona(e.target.value as Zone)}
                    className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm"
                  >
                    <option value="C">C</option>
                    <option value="A">A</option>
                  </select>
                </div>
                <Input
                  label="Length (mm)"
                  type="number"
                  step="any"
                  value={newPanjang}
                  onChange={(e) => setNewPanjang(e.target.value)}
                />
                <Input
                  label="Width (mm)"
                  type="number"
                  step="any"
                  value={newLebar}
                  onChange={(e) => setNewLebar(e.target.value)}
                />
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                Area dihitung otomatis: Length × Width (tampilan).
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" onClick={() => setPendingPos(null)}>
                  Cancel
                </Button>
                <Button onClick={handleAddIndication} loading={busy}>
                  Add Indication
                </Button>
              </div>
            </section>
          )}

          {componentId !== null && (
            <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <h3 className="text-[15px] font-semibold">Indication Details</h3>
              <div className="mt-2">
                <IndicationTable
                  items={indications}
                  selectedId={selectedId}
                  onSelect={(id) => dispatch(selectIndication(id))}
                />
              </div>
              <div className="mt-3">
                <Button onClick={handleCalculate} loading={busy} disabled={indications.length === 0}>
                  Save Inspection (Hitung & Evaluasi)
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
