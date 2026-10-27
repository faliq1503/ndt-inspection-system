import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Ellipse, Group, Image as KonvaImage, Layer, Rect, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import type { Indication } from '../../types/index';

/**
 * MappingCanvas — area mapping drawing berbasis React-Konva.
 *
 * Sistem koordinat (mengikuti backend):
 * - Koordinat yang disimpan = PERSEN 0–100 relatif terhadap ukuran ASLI
 *   gambar (bukan viewport/stage). Zoom & pan hanya mengubah tampilan,
 *   tidak mengubah nilai yang disimpan.
 * - Marker berupa ELIPS lonjong merah (lingkaran tidak sempurna) berukuran
 *   TETAP di layar (tidak mengikuti nilai Panjang/Lebar), dengan label angka
 *   persis nilai tersimpan (Panjang di sisi atas, Lebar di sisi kiri) + nomor
 *   urut. Posisi menempel pada drawing saat zoom/pan; ukuran visual konstan
 *   lewat counter-scale agar tidak terlalu besar.
 */

export interface CanvasPercent {
  x: number;
  y: number;
}

interface MappingCanvasProps {
  imageUrl: string;
  indications: Indication[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCanvasClick: (pos: CanvasPercent) => void;
  /** Sinyal dari tabel: center-kan marker ber-id ini (nonce berubah tiap request). */
  focusRequest: { id: number; nonce: number } | null;
  /** Mode baca-saja (mis. halaman detail): klik drawing tidak menambah indikasi. */
  readOnly?: boolean;
  /** Tampilkan marker indikasi. Default true. */
  showMarkers?: boolean;
  /** Kontrol tambahan (mis. tombol Ganti Gambar) yang digabung ke toolbar. */
  toolbarExtra?: ReactNode;
  /** Tampilkan teks petunjuk di toolbar. Default true. */
  showHint?: boolean;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 6;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Label anotasi ukuran (teks persis nilai tersimpan) dengan pil putih.
 * Dirender dalam group counter-scale sehingga ukuran layar konstan
 * namun posisinya menempel pada rectangle.
 */
function DimLabel({
  x,
  y,
  invK,
  text,
  align,
}: {
  x: number;
  y: number;
  invK: number;
  text: string;
  align: 'center' | 'right';
}) {
  const fs = 11;
  const w = text.length * fs * 0.62 + 12;
  const h = fs + 8;
  const boxX = align === 'center' ? -w / 2 : -w - 5;
  return (
    <Group x={x} y={y} scaleX={invK} scaleY={invK}>
      <Rect x={boxX} y={-h - 5} width={w} height={h} fill="#FFFFFF" opacity={0.92} cornerRadius={3} />
      <Text
        text={text}
        fontSize={fs}
        fontStyle="bold"
        fill="#B91C1C"
        width={w}
        x={boxX}
        y={-h - 5 + 4}
        align="center"
      />
    </Group>
  );
}

export default function MappingCanvas({
  imageUrl,
  indications,
  selectedId,
  onSelect,
  onCanvasClick,
  focusRequest,
  readOnly = false,
  toolbarExtra,
  showHint = true,
  showMarkers = true,
}: MappingCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const imageNodeRef = useRef<Konva.Image>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [stageW, setStageW] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const panRef = useRef({
    active: false,
    panning: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    onImage: false,
    lastX: 0,
    lastY: 0,
  });

  // Muat gambar (display saja; piksel tidak diekspor)
  useEffect(() => {
    let alive = true;
    const el = new Image();
    el.src = imageUrl;
    el.onload = () => {
      if (alive) {
        setImg(el);
        setZoom(1);
        setPos({ x: 0, y: 0 });
      }
    };
    return () => {
      alive = false;
    };
  }, [imageUrl]);

  // Lebar stage mengikuti container (resize-safe: koordinat % tetap valid)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setStageW(Math.max(320, el.clientWidth));
    });
    ro.observe(el);
    setStageW(Math.max(320, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const natW = img?.naturalWidth ?? 1;
  const natH = img?.naturalHeight ?? 1;
  const baseScale = stageW / natW;
  const k = baseScale * zoom; // skala efektif gambar→stage
  const stageH = Math.max(240, natH * baseScale);

  /** Stage point -> persen koordinat gambar (0–100). */
  function toPercent(stageX: number, stageY: number): CanvasPercent {
    const px = (stageX - pos.x) / k;
    const py = (stageY - pos.y) / k;
    const clamp = (v: number, max: number) => Math.min(100, Math.max(0, (v / max) * 100));
    return { x: round2(clamp(px, natW)), y: round2(clamp(py, natH)) };
  }

  /** Persen -> stage point (untuk marker & focusing). */
  function toStage(xPct: number, yPct: number): { x: number; y: number } {
    return { x: pos.x + (xPct / 100) * natW * k, y: pos.y + (yPct / 100) * natH * k };
  }

  function zoomAt(stageX: number, stageY: number, factor: number) {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
      if (next === z) return z;
      // Jaga titik stage tetap menunjuk piksel gambar yang sama
      const scaleRatio = next / z;
      setPos((p) => ({
        x: stageX - (stageX - p.x) * scaleRatio,
        y: stageY - (stageY - p.y) * scaleRatio,
      }));
      return next;
    });
  }

  function zoomAtCenter(factor: number) {
    zoomAt(stageW / 2, stageH / 2, factor);
  }

  function resetView() {
    setZoom(1);
    setPos({ x: 0, y: 0 });
  }

  function handlePointerDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const p = stageRef.current?.getPointerPosition();
    if (!p) return;
    panRef.current = {
      active: true,
      panning: false,
      startX: p.x,
      startY: p.y,
      origX: pos.x,
      origY: pos.y,
      onImage: e.target === imageNodeRef.current,
      lastX: p.x,
      lastY: p.y,
    };
  }

  function handlePointerMove() {
    const st = panRef.current;
    if (!st.active) return;
    const p = stageRef.current?.getPointerPosition();
    if (!p) return;
    st.lastX = p.x;
    st.lastY = p.y;
    const dx = p.x - st.startX;
    const dy = p.y - st.startY;
    if (!st.panning && Math.hypot(dx, dy) > 6) st.panning = true;
    if (st.panning) setPos({ x: st.origX + dx, y: st.origY + dy });
  }

  function handlePointerUp() {
    const st = panRef.current;
    if (st.active && !st.panning && st.onImage && !readOnly) {
      // Pada touchend Konva tidak punya posisi pointer, pakai posisi terakhir.
      const p = stageRef.current?.getPointerPosition() ?? { x: st.lastX, y: st.lastY };
      onCanvasClick(toPercent(p.x, p.y));
    }
    st.active = false;
    st.panning = false;
  }

  function handlePointerCancel() {
    panRef.current.active = false;
    panRef.current.panning = false;
  }

  // Center-kan marker ketika tabel meminta (klik row)
  useEffect(() => {
    if (!focusRequest) return;
    const ind = indications.find((i) => i.id === focusRequest.id);
    if (!ind || ind.posisi_x === null || ind.posisi_y === null) return;
    const s = toStage(ind.posisi_x, ind.posisi_y);
    setPos({ x: stageW / 2 - (s.x - pos.x), y: stageH / 2 - (s.y - pos.y) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Toolbar kanvas">
        {toolbarExtra}
        {toolbarExtra && (
          <span aria-hidden="true" className="h-5 w-px bg-ndt-border" />
        )}
        <button
          type="button"
          onClick={() => zoomAtCenter(1.25)}
          title="Perbesar"
          className="inline-flex items-center gap-1.5 rounded-md border border-ndt-border bg-white px-2.5 py-1 text-sm font-medium text-ndt-text hover:bg-ndt-primary-light"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          Perbesar
        </button>
        <button
          type="button"
          onClick={() => zoomAtCenter(1 / 1.25)}
          title="Perkecil"
          className="inline-flex items-center gap-1.5 rounded-md border border-ndt-border bg-white px-2.5 py-1 text-sm font-medium text-ndt-text hover:bg-ndt-primary-light"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          Perkecil
        </button>
        <button
          type="button"
          onClick={resetView}
          title="Atur ulang tampilan"
          className="inline-flex items-center gap-1.5 rounded-md border border-ndt-border bg-white px-2.5 py-1 text-sm font-medium text-ndt-text hover:bg-ndt-primary-light"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Atur Ulang
        </button>
        {showHint && (
          <span className="text-xs text-ndt-muted">{Math.round(zoom * 100)}% · geser untuk pan{readOnly ? '' : ' · klik gambar untuk Tambah Indikasi'}</span>
        )}
      </div>

      <div
        ref={wrapRef}
        className="overflow-hidden rounded-md border border-ndt-border bg-ndt-bg"
        style={{ cursor: readOnly ? 'grab' : 'crosshair' }}
      >
        <Stage
          ref={stageRef}
          width={stageW}
          height={stageH}
          // Catatan: zoom via scroll/wheel sengaja dimatikan agar scroll
          // halaman tetap natural. Zoom hanya lewat tombol toolbar.
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerCancel}
          // Layar sentuh (Android/iOS) hanya memicu event touch, bukan mouse.
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onTouchCancel={handlePointerCancel}
        >
          <Layer>
            <Group x={pos.x} y={pos.y} scaleX={k} scaleY={k}>
              {img && <KonvaImage ref={imageNodeRef} image={img} width={natW} height={natH} />}
              {img &&
                showMarkers &&
                indications.map((ind, i) => {
                  if (ind.posisi_x === null || ind.posisi_y === null) return null;
                  const cx = (ind.posisi_x / 100) * natW;
                  const cy = (ind.posisi_y / 100) * natH;
                  const invK = 1 / k;
                  const selected = selectedId === ind.id;
                  return (
                    <Group
                      key={ind.id}
                      onMouseDown={(e) => {
                        e.cancelBubble = true;
                      }}
                      onTouchStart={(e) => {
                        e.cancelBubble = true;
                      }}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        onSelect(ind.id);
                      }}
                      onTap={(e) => {
                        e.cancelBubble = true;
                        onSelect(ind.id);
                      }}
                    >
                      {/* Elips lonjong merah — ukuran layar tetap */}
                      <Group x={cx} y={cy} scaleX={invK} scaleY={invK}>
                        {selected && (
                          <Ellipse radiusX={39} radiusY={32} stroke="#0072CE" strokeWidth={2.5} />
                        )}
                        <Ellipse
                          radiusX={34}
                          radiusY={27}
                          fill="#DC2626"
                          fillOpacity={0.25}
                          stroke="#DC2626"
                          strokeWidth={2}
                        />
                        <Text
                          text={String(i + 1)}
                          fontSize={13}
                          fontStyle="bold"
                          fill="#FFFFFF"
                          stroke="#7F1D1D"
                          strokeWidth={0.8}
                          width={32}
                          x={-16}
                          y={-8}
                          align="center"
                        />
                      </Group>
                      {/* Label Panjang (nilai persis tersimpan) di sisi atas */}
                      <DimLabel x={cx} y={cy - 27 * invK} invK={invK} text={String(ind.panjang_mm)} align="center" />
                      {/* Label Lebar (nilai persis tersimpan) di sisi kiri */}
                      <DimLabel x={cx - 34 * invK} y={cy} invK={invK} text={String(ind.lebar_mm)} align="right" />
                    </Group>
                  );
                })}
            </Group>
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
