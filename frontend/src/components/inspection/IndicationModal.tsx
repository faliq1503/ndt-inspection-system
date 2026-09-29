import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import type { Zone } from '../../types/index';

interface IndicationModalProps {
  title: string;
  coordinateText: string;
  initialZona: Zone;
  initialPanjang: string;
  initialLebar: string;
  saving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (v: { zona: Zone; panjang_mm: number; lebar_mm: number }) => void;
}

/**
 * Modal Add/Edit Indication (spec §13).
 * Field mengikuti backend IndikasiIn: zona, panjang_mm, lebar_mm.
 * Koordinat (X/Y) hanya ditampilkan — berasal dari klik canvas.
 */
export default function IndicationModal({
  title,
  coordinateText,
  initialZona,
  initialPanjang,
  initialLebar,
  saving,
  submitLabel,
  onClose,
  onSubmit,
}: IndicationModalProps) {
  const [zona, setZona] = useState<Zone>(initialZona);
  const [panjang, setPanjang] = useState(initialPanjang);
  const [lebar, setLebar] = useState(initialLebar);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const p = parseFloat(panjang);
    const l = parseFloat(lebar);
    if (Number.isNaN(p) || Number.isNaN(l) || p <= 0 || l <= 0) {
      setError('Length dan Width harus angka positif (mm).');
      return;
    }
    setError(null);
    onSubmit({ zona, panjang_mm: p, lebar_mm: l });
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-xs text-[#64748B]">Coordinate — {coordinateText}</p>
      <div className="space-y-3">
        <div>
          <label htmlFor="ind-zona" className="mb-1 block text-[13px] font-medium text-[#172033]">
            Zone
          </label>
          <select
            id="ind-zona"
            value={zona}
            onChange={(e) => setZona(e.target.value as Zone)}
            className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#0072CE] focus:outline-none"
          >
            <option value="C">C</option>
            <option value="A">A</option>
          </select>
        </div>
        <Input
          label="Length (mm)"
          type="number"
          step="any"
          value={panjang}
          onChange={(e) => setPanjang(e.target.value)}
        />
        <Input
          label="Width (mm)"
          type="number"
          step="any"
          value={lebar}
          onChange={(e) => setLebar(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-[#DC2626]/10 px-3 py-2 text-sm text-[#DC2626]">
          {error}
        </p>
      )}
    </Modal>
  );
}
