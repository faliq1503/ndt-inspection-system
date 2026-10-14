import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import type { Zone } from '../../types/index';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_BUKTI_MB = 10;

export interface IndicationFormValue {
  zona: Zone;
  panjang_mm: number;
  lebar_mm: number;
  /** File foto bukti baru (null = tidak diubah). */
  buktiFile: File | null;
}

interface IndicationModalProps {
  title: string;
  coordinateText: string;
  initialZona: Zone;
  initialPanjang: string;
  initialLebar: string;
  /** URL foto bukti yang sudah tersimpan (mode edit). */
  initialBuktiUrl?: string | null;
  saving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (v: IndicationFormValue) => void;
}

/**
 * Modal Add/Edit Indication.
 * Field mengikuti backend IndikasiIn: zona, panjang_mm, lebar_mm.
 * Koordinat (X/Y) hanya ditampilkan — berasal dari klik canvas.
 * Foto bukti bersifat opsional dan diupload terpisah setelah
 * indikasi tersimpan (POST /indications/{id}/upload-bukti).
 */
export default function IndicationModal({
  title,
  coordinateText,
  initialZona,
  initialPanjang,
  initialLebar,
  initialBuktiUrl = null,
  saving,
  submitLabel,
  onClose,
  onSubmit,
}: IndicationModalProps) {
  const [zona, setZona] = useState<Zone>(initialZona);
  const [panjang, setPanjang] = useState(initialPanjang);
  const [lebar, setLebar] = useState(initialLebar);
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialBuktiUrl);
  const [error, setError] = useState<string | null>(null);

  function revokeBlob(url: string | null) {
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  useEffect(() => {
    return () => revokeBlob(previewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Foto bukti harus PNG atau JPG/JPEG.');
      return;
    }
    if (file.size > MAX_BUKTI_MB * 1024 * 1024) {
      setError(`Ukuran foto maksimal ${MAX_BUKTI_MB} MB.`);
      return;
    }
    setError(null);
    revokeBlob(previewUrl);
    setBuktiFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveFile() {
    revokeBlob(previewUrl);
    setBuktiFile(null);
    setPreviewUrl(initialBuktiUrl);
  }

  function handleSubmit() {
    const p = parseFloat(panjang);
    const l = parseFloat(lebar);
    if (Number.isNaN(p) || Number.isNaN(l) || p <= 0 || l <= 0) {
      setError('Panjang dan Lebar harus angka positif (mm).');
      return;
    }
    setError(null);
    onSubmit({ zona, panjang_mm: p, lebar_mm: l, buktiFile });
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F4FC] px-3 py-1 text-xs font-semibold text-[#0072CE]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Koordinat — {coordinateText}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 block text-sm font-medium text-[#172033]">Zona Indikasi</p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Zona indikasi">
            {(['C', 'A'] as Zone[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZona(z)}
                aria-pressed={zona === z}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                  zona === z
                    ? 'border-[#0072CE] bg-[#0072CE] text-white'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#0072CE]/50 hover:text-[#172033]'
                }`}
              >
                Zona {z}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Panjang (mm)"
            type="number"
            step="any"
            value={panjang}
            onChange={(e) => setPanjang(e.target.value)}
          />
          <Input
            label="Lebar (mm)"
            type="number"
            step="any"
            value={lebar}
            onChange={(e) => setLebar(e.target.value)}
          />
        </div>

        <div>
          <p className="mb-1.5 block text-sm font-medium text-[#172033]">Foto Bukti Pengukuran</p>
          {previewUrl ? (
            <div className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] p-3">
              <img
                src={previewUrl}
                alt="Pratinjau foto bukti pengukuran"
                className="h-20 w-20 shrink-0 rounded-md border border-[#E2E8F0] object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[#172033]">
                  {buktiFile ? buktiFile.name : 'Foto tersimpan'}
                </p>
                <p className="text-xs text-[#64748B]">
                  {buktiFile ? 'Foto baru — tersimpan saat indikasi disimpan.' : 'Ganti untuk mengunggah foto baru.'}
                </p>
                <div className="mt-1.5 flex gap-2">
                  <label className="cursor-pointer text-xs font-semibold text-[#0072CE] hover:underline">
                    Ganti
                    <input type="file" accept="image/png,image/jpeg" onChange={handlePickFile} className="hidden" />
                  </label>
                  {buktiFile && (
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-xs font-semibold text-[#DC2626] hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-[#E2E8F0] bg-[#F5F7FA] px-4 py-6 text-center transition-colors hover:border-[#0072CE]/50 hover:bg-[#E8F4FC]/50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0072CE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className="mt-2 text-sm font-medium text-[#172033]">Pilih foto bukti</span>
              <span className="mt-0.5 text-xs text-[#64748B]">PNG/JPG · maks {MAX_BUKTI_MB} MB · opsional</span>
              <input type="file" accept="image/png,image/jpeg" onChange={handlePickFile} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-[#DC2626]/10 px-3 py-2 text-sm text-[#DC2626]">
          {error}
        </p>
      )}
    </Modal>
  );
}
