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
      setError('Semua field wajib diisi dengan benar (Diameter ATAU P, pilih salah satu).');
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
      setNotice('Gambar berhasil diunggah.');
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

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        {/* Kolom kiri: form + calculation */}
        <div className="space-y-4">
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-lg border border-[#E2E8F0] bg-white p-4"
          >
            <h2 className="text-[15px] font-semibold">Data Inspeksi</h2>
            <Input
              label="Komponen / Tipe Objek"
              value={form.jenisBenda}
              onChange={(e) => dispatch(setForm({ jenisBenda: e.target.value }))}
              placeholder="mis. Bearing"
            />
            <label className="flex items-center gap-2 text-sm text-[#172033]">
              <input
                type="checkbox"
                checked={form.pakaiPManual}
                onChange={(e) => dispatch(setForm({ pakaiPManual: e.target.checked }))}
              />
              Komponen berbentuk pad/sepatu (isi P langsung, bukan Diameter)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {form.pakaiPManual ? (
                <Input
                  label="P / Keliling Pad (mm)"
                  type="number"
                  step="any"
                  value={form.panjangPManual}
                  onChange={(e) => dispatch(setForm({ panjangPManual: e.target.value }))}
                  placeholder="150"
                  hint="Diisi langsung, tidak dihitung dari Diameter."
                />
              ) : (
                <Input
                  label="Diameter (mm)"
                  type="number"
                  step="any"
                  value={form.diameterMm}
                  onChange={(e) => dispatch(setForm({ diameterMm: e.target.value }))}
                  placeholder="360"
                />
              )}
                <Input
                  label="Panjang (mm)"
                type="number"
                step="any"
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
            <Input
              label="Lebar Zona A (mm)"
              type="number"
              step="any"
              value={form.lebarZonaA}
              onChange={(e) =>
                dispatch(setForm({ lebarZonaA: e.target.value, lebarZonaATouched: true }))
              }
              hint="Default 10% dari Panjang (DOD-STD-2183). Boleh diubah manual, mis. untuk pad/sepatu."
            />
            <div>
              <label htmlFor="bearing-inspection" className="mb-1 block text-sm font-medium text-[#172033]">
                Bearing Inspection
              </label>
              <select
                id="bearing-inspection"
                value={form.zona}
                onChange={(e) => dispatch(setForm({ zona: e.target.value }))}
                className="w-full rounded-md border border-[#D0D9EA] bg-white px-3 py-2 text-sm text-[#172033] focus:border-[#0072CE] focus:outline-none focus:ring-[3px] focus:ring-[#0072CE]/15"
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
              <label htmlFor="standard" className="mb-1 block text-[13px] font-medium">
                Standar
              </label>
              <select
                id="standard"
                value={form.standardId}
                onChange={(e) =>
                  dispatch(setForm({ standardId: e.target.value === '' ? '' : Number(e.target.value) }))
                }
                className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#0072CE] focus:outline-none"
              >
                <option value="">-- Pilih standar --</option>
                {standards.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_standard} (toleransi {s.toleransi_persen}%)
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" loading={busy} className="w-full">
              {componentId === null ? 'Buat Inspeksi' : 'Perbarui & Buat Ulang'}
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
                  Lihat Riwayat
                </Link>
                <Button variant="secondary" onClick={handleReset} className="flex-1">
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
              <p className="mt-2 text-sm text-[#64748B]">
                Buat inspeksi terlebih dahulu, lalu unggah gambar di sini.
              </p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-md border border-[#E2E8F0] px-3 py-1.5 text-sm font-medium hover:bg-[#F5F7FA]">
                    {gambarUrl ? 'Ganti gambar' : 'Unggah gambar (PNG/JPG)'}
                    <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} className="hidden" />
                  </label>
                </div>
                {gambarUrl ? (
                  <div className="mt-3">
                    <Suspense fallback={<Loading label="Memuat kanvas..." />}>
                      <MappingCanvas
                        imageUrl={gambarUrl}
                        indications={indications}
                        selectedId={selectedId}
                        onSelect={(id) => dispatch(selectIndication(id))}
                        onCanvasClick={handleCanvasClick}
                        focusRequest={focusReq}
                        diameterMm={component?.diameter_mm ?? null}
                        lengthMm={component?.panjang_l_mm ?? null}
                      />
                    </Suspense>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#64748B]">Belum ada gambar. Unggah PNG/JPG untuk mulai pemetaan.</p>
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
                <Button onClick={handleCalculate} loading={busy} disabled={indications.length === 0}>
                  Simpan Inspeksi (Hitung & Evaluasi)
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
