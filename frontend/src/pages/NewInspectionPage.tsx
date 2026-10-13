import { Suspense, lazy, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import CalculationSummary from '../components/inspection/CalculationSummary';
import EvaluationResultCard from '../components/inspection/EvaluationResultCard';
import IndicationModal from '../components/inspection/IndicationModal';
import IndicationTable from '../components/inspection/IndicationTable';
import type { CanvasPercent } from '../components/inspection/MappingCanvas';

/** Konva dimuat terpisah (code-split) agar bundle awal tetap kecil. */
const MappingCanvas = lazy(() => import('../components/inspection/MappingCanvas'));
import { inspectionService } from '../services/inspectionService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearIndications, selectIndication, setIndications } from '../store/slices/indicationSlice';
import { resetWorkspace, setComponentId, setForm, setResult, suggestLebarZonaA } from '../store/slices/inspectionSlice';
import type { ComponentDetail, Indication, Standard } from '../types/index';

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
  const user = useAppSelector((s) => s.auth.user);
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

  // Modal Add/Edit indication + sinyal fokus marker dari tabel
  const [addPos, setAddPos] = useState<CanvasPercent | null>(null);
  const [editing, setEditing] = useState<Indication | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [focusReq, setFocusReq] = useState<{ id: number; nonce: number } | null>(null);
  // Toast kecil untuk notifikasi sukses (otomatis hilang)
  const [toast, setToast] = useState<string | null>(null);

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
        setStandardsError(err instanceof Error ? err.message : 'Gagal memuat standar.');
        setStandardsLoading(false);
      });
  }

  useEffect(() => {
    loadStandards();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function refreshComponent(id: number) {
    const detail = await inspectionService.getComponent(id);
    setComponent(detail);
    dispatch(setIndications(detail.indikasi_list));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const panjangPManual = form.pakaiPManual ? parseFloat(form.panjangPManual) : null;
    const diameter = form.pakaiPManual ? 0 : parseFloat(form.diameterMm);
    const panjang = parseFloat(form.panjangLMm);
    const lebarZonaA = form.lebarZonaA.trim() === '' ? null : parseFloat(form.lebarZonaA);
    if (
      !form.jenisBenda.trim() ||
      (!form.pakaiPManual && Number.isNaN(diameter)) ||
      (form.pakaiPManual && (panjangPManual === null || Number.isNaN(panjangPManual))) ||
      Number.isNaN(panjang) ||
      form.standardId === '' ||
      (lebarZonaA !== null && Number.isNaN(lebarZonaA))
    ) {
    setError('Semua field wajib diisi dengan benar (isi Diameter, atau Panjang (P) langsung).');
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
        lebar_zona_a_mm: lebarZonaA,
        panjang_p_mm: panjangPManual,
      });
      dispatch(setComponentId(created.id));
      dispatch(setResult(null));
      dispatch(clearIndications());
      await refreshComponent(created.id);
      setNotice(`Komponen #${created.id} dibuat. Lanjut unggah gambar.`);
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
      setToast('Gambar berhasil diunggah.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  /** Klik pada drawing (koordinat % dari canvas) → buka modal Add. */
  function handleCanvasClick(posPct: CanvasPercent) {
    if (componentId === null) return;
    setEditing(null);
    setAddPos(posPct);
  }

  async function handleAddSubmit(v: { zona: Indication['zona']; panjang_mm: number; lebar_mm: number }) {
    if (componentId === null || addPos === null) return;
    setError(null);
    setModalSaving(true);
    try {
      await inspectionService.addIndication(componentId, {
        zona: v.zona,
        panjang_mm: v.panjang_mm,
        lebar_mm: v.lebar_mm,
        posisi_x: addPos.x,
        posisi_y: addPos.y,
      });
      await refreshComponent(componentId);
      setAddPos(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah indikasi.');
    } finally {
      setModalSaving(false);
    }
  }

  /** Edit didukung backend via PUT /indications/{id}/size. */
  async function handleEditSubmit(v: { zona: Indication['zona']; panjang_mm: number; lebar_mm: number }) {
    if (editing === null) return;
    setError(null);
    setModalSaving(true);
    try {
      await inspectionService.updateSize(editing.id, v.zona, v.panjang_mm, v.lebar_mm);
      if (componentId !== null) await refreshComponent(componentId);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan.');
    } finally {
      setModalSaving(false);
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
      setNotice('Inspeksi berhasil disimpan. Hasil dihitung oleh backend.');
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
    setAddPos(null);
    setEditing(null);
    setFocusReq(null);
    setError(null);
    setNotice(null);
  }

  /** Klik row → highlight marker + center-kan di canvas. */
  function handleSelectRow(id: number) {
    dispatch(selectIndication(id));
    setFocusReq((prev) => ({ id, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  const gambarUrl = inspectionService.imageUrl(component?.gambar_path ?? null);
  const activeStandard = standards.find((s) => s.id === form.standardId);

  // Stepper mengikuti kondisi nyata: Data → Pemetaan → Hasil
  const steps = [
    { n: 1, label: 'Data', state: componentId !== null ? 'done' : 'active' },
    {
      n: 2,
      label: 'Pemetaan',
      state: componentId === null ? 'todo' : indications.length > 0 ? 'done' : 'active',
    },
    {
      n: 3,
      label: 'Hasil',
      state: result !== null ? 'done' : componentId !== null && indications.length > 0 ? 'active' : 'todo',
    },
  ] as Array<{ n: number; label: string; state: 'todo' | 'active' | 'done' }>;

  if (standardsLoading) return <Loading label="Memuat standar..." />;
  if (standardsError) return <ErrorState message={standardsError} onRetry={loadStandards} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inspeksi Baru</h1>
          <p className="text-sm text-[#64748B]">Input, pemetaan, perhitungan, dan evaluasi</p>
        </div>
        {componentId !== null && (
          <Button variant="secondary" onClick={handleReset}>
            Batal
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

      {componentId !== null && (
        <ol className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 sm:gap-2" aria-label="Tahapan inspeksi">
          {steps.map((s, idx) => (
            <li key={s.n} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
              <span
                aria-current={s.state === 'active' ? 'step' : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  s.state === 'done'
                    ? 'bg-[#0072CE] text-white'
                    : s.state === 'active'
                      ? 'border-2 border-[#0072CE] text-[#0072CE]'
                      : 'border border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {s.state === 'done' ? '✓' : s.n}
              </span>
              <span
                className={`truncate text-[13px] font-medium ${
                  s.state === 'todo' ? 'text-[#64748B]' : 'text-[#172033]'
                }`}
              >
                {s.label}
              </span>
              {idx < steps.length - 1 && (
                <span aria-hidden="true" className="mx-1 h-px min-w-3 flex-1 bg-[#E2E8F0] sm:min-w-6" />
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        {/* Kolom kiri: form + calculation */}
        <div className="space-y-4">
          <form
            onSubmit={handleCreate}
            className="space-y-4 rounded-lg border border-[#E2E8F0] bg-white p-4"
          >
            <h2 className="text-[15px] font-semibold">Data Inspeksi</h2>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Identitas Komponen
              </legend>
              <Input
                label="Komponen / Tipe Objek"
                value={form.jenisBenda}
                onChange={(e) => dispatch(setForm({ jenisBenda: e.target.value }))}
                placeholder="mis. Bearing"
              />
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Dimensi
              </legend>
              <label className="mb-2 flex items-center gap-2 text-sm text-[#172033]">
                <input
                  type="checkbox"
                  checked={form.pakaiPManual}
                  onChange={(e) => dispatch(setForm({ pakaiPManual: e.target.checked }))}
                  className="h-4 w-4 accent-[#0072CE]"
                />
                  Panjang (P) sudah diketahui, isi langsung tanpa Diameter
              </label>
              <div className="grid grid-cols-2 gap-3">
                {form.pakaiPManual ? (
                  <Input
                    label="Pamjang / Keliling Pad"
                    type="number"
                    step="any"
                    suffix="mm"
                    value={form.panjangPManual}
                    onChange={(e) => dispatch(setForm({ panjangPManual: e.target.value }))}
                    placeholder="150"
                    hint="Diisi langsung, tidak dihitung dari Diameter."
                  />
                ) : (
                  <Input
                    label="Diameter"
                    type="number"
                    step="any"
                    suffix="mm"
                    value={form.diameterMm}
                    onChange={(e) => dispatch(setForm({ diameterMm: e.target.value }))}
                    placeholder="360"
                    hint="Panjang (P) dihitung otomatis: π × D ÷ 2."
                  />
                )}
                <Input
                  label="Lebar (L)"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.panjangLMm}
                  onChange={(e) => {
                    const value = e.target.value;
                    dispatch(setForm({ panjangLMm: value }));
                    const n = parseFloat(value);
                    if (!Number.isNaN(n)) dispatch(suggestLebarZonaA(n));
                  }}
                  placeholder="101"
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Pengaturan Inspeksi
              </legend>
              <div className="space-y-3">
                <Input
                  label="Lebar Zona A"
                  type="number"
                  step="any"
                  suffix="mm"
                  value={form.lebarZonaA}
                  onChange={(e) =>
                    dispatch(setForm({ lebarZonaA: e.target.value, lebarZonaATouched: true }))
                  }
                  hint="Default 10% dari Lebar (L) (DOD-STD-2183). Boleh diubah manual, mis. untuk pad/sepatu."
                />
                <div>
                  <label htmlFor="bearing-inspection" className="mb-1.5 block text-sm font-medium text-[#172033]">
                    Bearing Inspection
                  </label>
                  <select
                    id="bearing-inspection"
                    value={form.zona}
                    onChange={(e) => dispatch(setForm({ zona: e.target.value }))}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#172033] focus:border-[#0072CE] focus:outline-none focus:ring-[3px] focus:ring-[#0072CE]/15"
                  >
                    <option value="">-- Pilih bearing inspection --</option>
                    <option value="Upper">Upper</option>
                    <option value="Lower">Lower</option>
                  </select>
                </div>
                <Input
                  label="Inspektur"
                  value={user?.username ?? ''}
                  readOnly
                  hint="Otomatis dari akun yang sedang login."
                />
                <div>
                  <label htmlFor="standard" className="mb-1.5 block text-sm font-medium text-[#172033]">
                    Standar
                  </label>
                  <select
                    id="standard"
                    value={form.standardId}
                    onChange={(e) =>
                      dispatch(setForm({ standardId: e.target.value === '' ? '' : Number(e.target.value) }))
                    }
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#172033] focus:border-[#0072CE] focus:outline-none focus:ring-[3px] focus:ring-[#0072CE]/15"
                  >
                    <option value="">-- Pilih standar --</option>
                    {standards.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_standard} (toleransi {s.toleransi_persen}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>
            <Button type="submit" loading={busy} className="w-full">
              {componentId === null ? 'Buat Inspeksi' : 'Perbarui & Buat Ulang'}
            </Button>
          </form>

          {result && (
            <>
              <CalculationSummary result={result} standard={activeStandard} emphasize />
              <EvaluationResultCard result={result} size="lg" />
              <div className="flex gap-2">
                <Link
                  to="/inspection/history"
                  className="flex-1 rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-center text-sm font-medium text-[#172033] hover:bg-[#E8F4FC]"
                >
                  Lihat Riwayat
                </Link>
                <Button onClick={handleReset} className="flex-1">
                  Simpan & Baru
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Kolom kanan: drawing + indikasi */}
        <div className="space-y-4">
          <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
            <h2 className="text-[15px] font-semibold">Pemetaan Inspeksi 2D</h2>
            {componentId === null ? (
              <div className="mt-3 flex flex-col items-center rounded-lg border border-dashed border-[#E2E8F0] bg-[#F5F7FA] px-4 py-10 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <p className="mt-3 text-sm font-medium text-[#172033]">Belum ada inspeksi</p>
                <p className="mt-1 max-w-xs text-[13px] text-[#64748B]">
                  Buat inspeksi terlebih dahulu, lalu unggah gambar di sini.
                </p>
              </div>
            ) : (
              <>
                {gambarUrl ? (
                  <>
                    <div className="mt-2 flex items-center gap-2 rounded-md border border-[#0284C7]/25 bg-[#0284C7]/[0.07] px-3 py-2 text-[13px] text-[#0284C7]" role="note">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      Geser untuk pan · Klik gambar untuk menambahkan indikasi.
                    </div>
                    <div className="mt-3 max-h-[620px] overflow-auto rounded-md">
                      <Suspense fallback={<Loading label="Memuat kanvas..." />}>
                        <MappingCanvas
                          imageUrl={gambarUrl}
                          indications={indications}
                          selectedId={selectedId}
                          onSelect={(id) => dispatch(selectIndication(id))}
                          onCanvasClick={handleCanvasClick}
                          focusRequest={focusReq}
                          showHint={false}
                          toolbarExtra={
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-sm font-medium text-[#172033] hover:bg-[#E8F4FC]" title="Ganti gambar drawing">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <path d="M17 8l-5-5-5 5" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              Ganti Gambar
                              <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} className="hidden" />
                            </label>
                          }
                        />
                      </Suspense>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#64748B]" aria-label="Legenda marker">
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className="inline-block h-3 w-4 rounded-full border-2 border-[#DC2626] bg-[#DC2626]/25" />
                        Indikasi
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className="inline-block h-3 w-4 rounded-full border-2 border-[#0072CE]" />
                        Terpilih
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="mt-3">
                    <label className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-[#E2E8F0] bg-[#F5F7FA] px-4 py-10 text-center hover:border-[#0072CE]/50 hover:bg-[#E8F4FC]/50">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0072CE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <path d="M17 8l-5-5-5 5" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span className="mt-3 text-sm font-medium text-[#172033]">Unggah gambar (PNG/JPG)</span>
                      <span className="mt-1 text-xs text-[#64748B]">Maksimal 10 MB · klik untuk memilih file</span>
                      <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </>
            )}
          </section>

          {addPos && (
            <IndicationModal
              key={`add-${addPos.x}-${addPos.y}`}
              title="Tambah Indikasi"
              coordinateText={`X: ${addPos.x} — Y: ${addPos.y}`}
              initialZona="C"
              initialPanjang=""
              initialLebar=""
              saving={modalSaving}
              submitLabel="Tambah Indikasi"
              onClose={() => setAddPos(null)}
              onSubmit={handleAddSubmit}
            />
          )}

          {editing && (
            <IndicationModal
              key={`edit-${editing.id}`}
              title={`Ubah Indikasi #${indications.findIndex((i) => i.id === editing.id) + 1}`}
              coordinateText={`X: ${editing.posisi_x ?? '-'} — Y: ${editing.posisi_y ?? '-'}`}
              initialZona={editing.zona}
              initialPanjang={String(editing.panjang_mm)}
              initialLebar={String(editing.lebar_mm)}
              saving={modalSaving}
              submitLabel="Simpan Perubahan"
              onClose={() => setEditing(null)}
              onSubmit={handleEditSubmit}
            />
          )}

          {componentId !== null && (
            <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
              <h3 className="text-[15px] font-semibold">Detail Indikasi</h3>
              <div className="mt-2">
                <IndicationTable
                  items={indications}
                  selectedId={selectedId}
                  onSelect={handleSelectRow}
                  onEdit={(ind) => {
                    setAddPos(null);
                    setEditing(ind);
                  }}
                />
              </div>
              <div className="mt-3">
                <Button
                  onClick={handleCalculate}
                  loading={busy}
                  disabled={indications.length === 0}
                  variant={indications.length === 0 ? 'secondary' : 'primary'}
                  className={
                    indications.length === 0
                      ? 'cursor-not-allowed bg-[#F5F7FA] text-[#64748B] hover:bg-[#F5F7FA]'
                      : ''
                  }
                >
                  Simpan Inspeksi (Hitung & Evaluasi)
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-lg border border-[#16A34A]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#16A34A] shadow-[0_8px_24px_rgba(23,32,51,0.12)]"
        >
          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-xs font-bold text-white">
            ✓
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
