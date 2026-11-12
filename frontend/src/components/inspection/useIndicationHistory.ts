import { useState } from 'react';
import { inspectionService } from '../../services/inspectionService';
import type { Indication, Zone } from '../../types/index';

export interface UkuranIndikasi {
  zona: Zone;
  panjang_mm: number;
  lebar_mm: number;
}

/** Satu langkah yang bisa diurungkan. Indikasi yang dikembalikan memakai id yang sama. */
type Langkah =
  | { jenis: 'tambah'; id: number; data?: Indication }
  | { jenis: 'hapus'; id: number; data: Indication }
  | { jenis: 'ubah'; id: number; sebelum: UkuranIndikasi; sesudah: UkuranIndikasi };

/**
 * Urungkan/Ulangi untuk tambah, hapus, dan ubah indikasi pada satu komponen.
 * Riwayat hanya hidup selama halaman terbuka dan dikosongkan saat komponen berganti.
 */
export function useIndicationHistory(componentId: number | null, refresh: () => Promise<void>) {
  const [undoStack, setUndoStack] = useState<Langkah[]>([]);
  const [redoStack, setRedoStack] = useState<Langkah[]>([]);
  const [busy, setBusy] = useState(false);

  // Komponen berganti: riwayat lama tidak berlaku
  const [pemilik, setPemilik] = useState(componentId);
  if (pemilik !== componentId) {
    setPemilik(componentId);
    setUndoStack([]);
    setRedoStack([]);
  }

  function catat(langkah: Langkah) {
    setUndoStack((s) => [...s, langkah]);
    setRedoStack([]);
  }

  function catatTambah(id: number) {
    catat({ jenis: 'tambah', id });
  }

  function catatUbah(id: number, sebelum: UkuranIndikasi, sesudah: UkuranIndikasi) {
    const sama =
      sebelum.zona === sesudah.zona &&
      sebelum.panjang_mm === sesudah.panjang_mm &&
      sebelum.lebar_mm === sesudah.lebar_mm;
    if (!sama) catat({ jenis: 'ubah', id, sebelum, sesudah });
  }

  /** Hapus indikasi; data terakhir (termasuk foto bukti) disimpan supaya bisa dikembalikan utuh. */
  function hapusId(id: number): Promise<Indication> {
    return inspectionService.deleteIndication(id);
  }

  /** Buat ulang indikasi yang pernah dihapus dengan id, posisi, dan foto bukti yang sama (nomor urut tetap). */
  async function buatUlang(data: Indication | undefined) {
    if (componentId === null || !data) throw new Error('Data indikasi untuk dikembalikan tidak tersedia.');
    await inspectionService.addIndication(componentId, {
      zona: data.zona,
      panjang_mm: data.panjang_mm,
      lebar_mm: data.lebar_mm,
      posisi_x: data.posisi_x,
      posisi_y: data.posisi_y,
      id: data.id,
      bukti_path: data.bukti_path,
    });
  }

  /** Jalankan langkah ke arah undo/redo; mengembalikan langkah yang diperbarui untuk tumpukan seberang. */
  async function terapkan(l: Langkah, arah: 'undo' | 'redo'): Promise<Langkah> {
    if (l.jenis === 'ubah') {
      const u = arah === 'undo' ? l.sebelum : l.sesudah;
      await inspectionService.updateSize(l.id, u.zona, u.panjang_mm, u.lebar_mm);
      return l;
    }
    // tambah dibatalkan = hapus; hapus dibatalkan = buat ulang
    const menghapus = (l.jenis === 'tambah') === (arah === 'undo');
    if (menghapus) return { ...l, data: await hapusId(l.id) };
    await buatUlang(l.data);
    return l;
  }

  /** Hapus satu indikasi dari tabel; tercatat sehingga bisa diurungkan. */
  async function hapus(id: number) {
    if (busy) return;
    setBusy(true);
    try {
      const data = await hapusId(id);
      catat({ jenis: 'hapus', id, data });
      await refresh();
    } finally {
      setBusy(false);
    }
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
      if (langkah.jenis === 'hapus') {
        return arah === 'undo' ? 'Indikasi yang dihapus dikembalikan.' : 'Indikasi dihapus lagi.';
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
    hapus,
    urungkan: () => jalankan('undo'),
    ulangi: () => jalankan('redo'),
  };
}
