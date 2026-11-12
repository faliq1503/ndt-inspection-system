import { useRef, useState } from 'react';
import { inspectionService } from '../../services/inspectionService';
import type { Indication, Zone } from '../../types/index';

export interface UkuranIndikasi {
  zona: Zone;
  panjang_mm: number;
  lebar_mm: number;
}

/**
 * Satu langkah yang bisa diurungkan. `key` = id indikasi saat pertama dibuat;
 * id di database berubah setiap indikasi dikembalikan lewat Ulangi.
 */
type Langkah =
  | { jenis: 'tambah'; key: number; data?: Indication }
  | { jenis: 'ubah'; key: number; sebelum: UkuranIndikasi; sesudah: UkuranIndikasi };

/**
 * Urungkan/Ulangi untuk tambah dan ubah indikasi pada satu komponen.
 * Riwayat hanya hidup selama halaman terbuka dan dikosongkan saat komponen berganti.
 */
export function useIndicationHistory(componentId: number | null, refresh: () => Promise<void>) {
  const [undoStack, setUndoStack] = useState<Langkah[]>([]);
  const [redoStack, setRedoStack] = useState<Langkah[]>([]);
  const [busy, setBusy] = useState(false);
  const keyToId = useRef(new Map<number, number>());
  const idToKey = useRef(new Map<number, number>());

  // Komponen berganti: riwayat lama tidak berlaku. Peta id tidak perlu dikosongkan
  // karena id indikasi unik di seluruh database.
  const [pemilik, setPemilik] = useState(componentId);
  if (pemilik !== componentId) {
    setPemilik(componentId);
    setUndoStack([]);
    setRedoStack([]);
  }

  const idSekarang = (key: number) => keyToId.current.get(key) ?? key;
  const keyDari = (id: number) => idToKey.current.get(id) ?? id;

  function catat(langkah: Langkah) {
    setUndoStack((s) => [...s, langkah]);
    setRedoStack([]);
  }

  function catatTambah(id: number) {
    catat({ jenis: 'tambah', key: keyDari(id) });
  }

  function catatUbah(id: number, sebelum: UkuranIndikasi, sesudah: UkuranIndikasi) {
    const sama =
      sebelum.zona === sesudah.zona &&
      sebelum.panjang_mm === sesudah.panjang_mm &&
      sebelum.lebar_mm === sesudah.lebar_mm;
    if (!sama) catat({ jenis: 'ubah', key: keyDari(id), sebelum, sesudah });
  }

  /** Jalankan langkah ke arah undo/redo; mengembalikan langkah yang diperbarui untuk tumpukan seberang. */
  async function terapkan(l: Langkah, arah: 'undo' | 'redo'): Promise<Langkah> {
    if (l.jenis === 'ubah') {
      const u = arah === 'undo' ? l.sebelum : l.sesudah;
      await inspectionService.updateSize(idSekarang(l.key), u.zona, u.panjang_mm, u.lebar_mm);
      return l;
    }
    if (arah === 'undo') {
      // Simpan data terakhir (termasuk foto bukti) supaya Ulangi mengembalikannya utuh
      const data = await inspectionService.deleteIndication(idSekarang(l.key));
      return { ...l, data };
    }
    if (componentId === null || !l.data) throw new Error('Data indikasi untuk Ulangi tidak tersedia.');
    const created = await inspectionService.addIndication(componentId, {
      zona: l.data.zona,
      panjang_mm: l.data.panjang_mm,
      lebar_mm: l.data.lebar_mm,
      posisi_x: l.data.posisi_x,
      posisi_y: l.data.posisi_y,
      bukti_path: l.data.bukti_path,
    });
    idToKey.current.delete(idSekarang(l.key));
    keyToId.current.set(l.key, created.id);
    idToKey.current.set(created.id, l.key);
    return l;
  }

  async function jalankan(arah: 'undo' | 'redo'): Promise<string | null> {
    const sumber = arah === 'undo' ? undoStack : redoStack;
    const langkah = sumber[sumber.length - 1];
    if (!langkah || busy) return null;
    setBusy(true);
    try {
      const hasil = await terapkan(langkah, arah);
      const setSumber = arah === 'undo' ? setUndoStack : setRedoStack;
      const setTujuan = arah === 'undo' ? setRedoStack : setUndoStack;
      setSumber((s) => s.slice(0, -1));
      setTujuan((s) => [...s, hasil]);
      await refresh();
      if (langkah.jenis === 'tambah') {
        return arah === 'undo' ? 'Penambahan indikasi diurungkan.' : 'Indikasi dikembalikan.';
      }
      return arah === 'undo' ? 'Perubahan indikasi diurungkan.' : 'Perubahan indikasi diterapkan lagi.';
    } finally {
      setBusy(false);
    }
  }

  return {
    canUndo: undoStack.length > 0 && !busy,
    canRedo: redoStack.length > 0 && !busy,
    busy,
    catatTambah,
    catatUbah,
    urungkan: () => jalankan('undo'),
    ulangi: () => jalankan('redo'),
  };
}
