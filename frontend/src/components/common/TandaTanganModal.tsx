import { useState } from 'react';
import type { FormEvent } from 'react';
import type { TandaTanganIsian } from '../../types/index';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';

const STORAGE_KEY = 'ndt_tanda_tangan';

/** Nama terakhir yang dipakai, supaya tidak perlu diketik ulang tiap ekspor. */
function namaTerakhir(): TandaTanganIsian {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<TandaTanganIsian>;
      return { prepared: v.prepared ?? '', approved: v.approved ?? '', jabatanApproved: v.jabatanApproved ?? '' };
    }
  } catch {
    // localStorage tidak tersedia / isi rusak: mulai kosong
  }
  return { prepared: '', approved: '', jabatanApproved: '' };
}

function simpanNama(v: TandaTanganIsian) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // abaikan: hanya kenyamanan
  }
}

/**
 * Isian nama PREPARED BY serta nama dan jabatan APPROVED BY sebelum ekspor PDF/Excel.
 * CHECKED BY tetap terisi otomatis dari backend.
 */
export default function TandaTanganModal({
  title,
  onClose,
  onSubmit,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (v: TandaTanganIsian) => void;
}) {
  const [nilai, setNilai] = useState<TandaTanganIsian>(namaTerakhir);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const bersih = {
      prepared: nilai.prepared.trim(),
      approved: nilai.approved.trim(),
      jabatanApproved: nilai.jabatanApproved.trim(),
    };
    simpanNama(bersih);
    onSubmit(bersih);
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => handleSubmit()}>Ekspor</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Prepared By (Staff Quality Control)"
          value={nilai.prepared}
          maxLength={60}
          placeholder="Nama penyusun"
          onChange={(e) => setNilai((v) => ({ ...v, prepared: e.target.value }))}
          autoFocus
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Jabatan Approved By"
            value={nilai.jabatanApproved}
            maxLength={60}
            placeholder="Mis. Manager Bagian"
            onChange={(e) => setNilai((v) => ({ ...v, jabatanApproved: e.target.value }))}
          />
          <Input
            label="Nama Approved By"
            value={nilai.approved}
            maxLength={60}
            placeholder="Nama penyetuju"
            onChange={(e) => setNilai((v) => ({ ...v, approved: e.target.value }))}
          />
        </div>
        <p className="text-xs text-ndt-muted">
          Boleh dikosongkan untuk diisi tangan. Checked By terisi otomatis.
        </p>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
