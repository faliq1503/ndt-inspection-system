import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import { standardService } from '../services/standardService';
import type { StandardPayload } from '../services/standardService';
import type { Standard } from '../types/index';

interface FormState {
  nama: string;
  lebarZonaA: string;
  toleransi: string;
  individuA: string;
  individuCPersen: string;
  individuCMax: string;
  keterangan: string;
}

// Default mengikuti DOD-STD-2183 (SH)
const EMPTY_FORM: FormState = {
  nama: '',
  lebarZonaA: '25',
  toleransi: '15',
  individuA: '12.5',
  individuCPersen: '3',
  individuCMax: '650',
  keterangan: '',
};

function toForm(s: Standard): FormState {
  return {
    nama: s.nama_standard,
    lebarZonaA: String(s.lebar_zona_a_mm),
    toleransi: String(s.toleransi_persen),
    individuA: String(s.individu_zona_a_mm),
    individuCPersen: String(s.individu_zona_c_persen),
    individuCMax: String(s.individu_zona_c_max_mm2),
    keterangan: s.keterangan ?? '',
  };
}

/** Mengembalikan payload, atau string pesan error kalau input tidak valid. */
function toPayload(f: FormState): StandardPayload | string {
  const nama = f.nama.trim();
  if (!nama) return 'Nama standar wajib diisi.';

  const lebar = parseFloat(f.lebarZonaA);
  const tol = parseFloat(f.toleransi);
  const indA = parseFloat(f.individuA);
  const indCPersen = parseFloat(f.individuCPersen);
  const indCMax = parseFloat(f.individuCMax);

  if ([lebar, tol, indA, indCPersen, indCMax].some((n) => Number.isNaN(n))) {
    return 'Semua kolom angka wajib diisi dengan benar.';
  }
  if (lebar <= 0 || indA <= 0 || indCPersen <= 0 || indCMax <= 0) {
    return 'Semua nilai harus lebih dari 0.';
  }
  if (tol <= 0 || tol > 100) return 'Toleransi harus di antara 0 dan 100 persen.';
  if (indCPersen > 100) return 'Batas indikasi Zona C (%) tidak boleh lebih dari 100.';

  return {
    nama_standard: nama,
    lebar_zona_a_mm: lebar,
    toleransi_persen: tol,
    individu_zona_a_mm: indA,
    individu_zona_c_persen: indCPersen,
    individu_zona_c_max_mm2: indCMax,
    keterangan: f.keterangan.trim(),
  };
}

/** Halaman /admin/standards — hanya admin (dijaga AdminRoute + backend). */
export default function StandardsPage() {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Standard | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    setStandards(await standardService.list());
  }

  function initialLoad() {
    setLoading(true);
    setLoadError(null);
    refresh()
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat daftar standar.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    initialLoad();
  }, []);

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(s: Standard) {
    setEditingId(s.id);
    setForm(toForm(s));
    setError(null);
    setNotice(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError(null);
    setNotice(null);
    setDeleting(true);
    try {
      await standardService.remove(deleteTarget.id);
      if (editingId === deleteTarget.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      setNotice(`Standar "${deleteTarget.nama_standard}" berhasil dihapus.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus standar.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const payload = toPayload(form);
    if (typeof payload === 'string') {
      setError(payload);
      return;
    }
    setBusy(true);
    try {
      if (editingId === null) {
        await standardService.create(payload);
        setNotice(`Standar "${payload.nama_standard}" berhasil dibuat.`);
      } else {
        await standardService.update(editingId, payload);
        setNotice(`Standar "${payload.nama_standard}" berhasil diperbarui.`);
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan standar.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Memuat daftar standar..." />;
  if (loadError) return <ErrorState message={loadError} onRetry={initialLoad} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Kelola Standar</h1>
        <p className="text-sm text-[#64748B]">
          Kriteria penerimaan yang dipakai saat perhitungan dan evaluasi inspeksi.
        </p>
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus standar?"
        message={`Standar "${deleteTarget?.nama_standard ?? ''}" akan dihapus permanen dan tidak bisa dikembalikan.`}
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-[#E2E8F0] bg-white p-4"
        >
          <h2 className="text-[15px] font-semibold">
            {editingId === null ? 'Buat Standar Baru' : `Ubah Standar #${editingId}`}
          </h2>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Umum
            </legend>
            <div className="space-y-3">
              <Input
                label="Nama Standar"
                value={form.nama}
                onChange={(e) => setField('nama', e.target.value)}
                placeholder="mis. DOD-STD-2183 (SH)"
              />
              <Input
                label="Toleransi Unbond"
                type="number"
                step="any"
                suffix="%"
                value={form.toleransi}
                onChange={(e) => setField('toleransi', e.target.value)}
                hint="Berlaku untuk Zona A dan Zona C."
              />
              <Input
                label="Keterangan"
                value={form.keterangan}
                onChange={(e) => setField('keterangan', e.target.value)}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Zona A
            </legend>
            <div className="space-y-3">
              <Input
                label="Lebar Zona A"
                type="number"
                step="any"
                suffix="mm"
                value={form.lebarZonaA}
                onChange={(e) => setField('lebarZonaA', e.target.value)}
                hint="Offset Zona C = lebar Zona A × 2."
              />
              <Input
                label="Maks. Dimensi 1 Indikasi Zona A"
                type="number"
                step="any"
                suffix="mm"
                value={form.individuA}
                onChange={(e) => setField('individuA', e.target.value)}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Zona C
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Maks. Luas"
                type="number"
                step="any"
                suffix="%"
                value={form.individuCPersen}
                onChange={(e) => setField('individuCPersen', e.target.value)}
                hint="Dari luas babbit total."
              />
              <Input
                label="Maks. Luas"
                type="number"
                step="any"
                suffix="mm²"
                value={form.individuCMax}
                onChange={(e) => setField('individuCMax', e.target.value)}
                hint="Dipakai yang lebih kecil."
              />
            </div>
          </fieldset>
          <div className="flex gap-2">
            {editingId !== null && (
              <Button variant="secondary" onClick={cancelEdit}>
                Batal
              </Button>
            )}
            <Button type="submit" loading={busy} className="flex-1">
              {editingId === null ? 'Buat Standar' : 'Simpan Perubahan'}
            </Button>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-[#0072CE]/25 bg-[#E8F4FC] px-3 py-2.5" role="note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#005B9A" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-[13px] leading-relaxed text-[#005B9A]">
              Untuk versi standar baru, lebih aman membuat standar baru daripada mengubah yang lama.
              Menghitung ulang komponen lama akan memakai nilai terbaru.
            </p>
          </div>
        </form>

        <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <h2 className="text-[15px] font-semibold">Daftar Standar</h2>
          {standards.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#64748B]">Belum ada standar.</p>
          ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs text-[#64748B]">
                  <th className="py-2 pr-4 font-medium">Nama</th>
                  <th className="py-2 pr-4 text-right font-medium">Zona A</th>
                  <th className="py-2 pr-4 text-right font-medium">Toleransi</th>
                  <th className="py-2 pr-4 text-right font-medium">Indikasi A</th>
                  <th className="py-2 pr-4 text-right font-medium">Indikasi C</th>
                  <th className="py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {standards.map((s) => (
                  <tr key={s.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#E8F4FC]">
                    <td className="py-2 pr-4 font-semibold">{s.nama_standard}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {s.lebar_zona_a_mm} <span className="text-[#64748B]">mm</span>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {s.toleransi_persen} <span className="text-[#64748B]">%</span>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      ≤ {s.individu_zona_a_mm} <span className="text-[#64748B]">mm</span>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      <span className="block">≤ {s.individu_zona_c_persen} <span className="text-[#64748B]">%</span></span>
                      <span className="block text-[#64748B]">{s.individu_zona_c_max_mm2} mm²</span>
                    </td>
                    <td className="py-2">
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => startEdit(s)}>
                          <span className="inline-flex items-center gap-1">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                            Ubah
                          </span>
                        </Button>
                        <Button variant="destructive" onClick={() => setDeleteTarget(s)}>
                          <span className="inline-flex items-center gap-1">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 6h18" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Hapus
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </section>
      </div>
    </div>
  );
}