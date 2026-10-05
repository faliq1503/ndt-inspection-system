import { useEffect, useRef, useState } from 'react';
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
        <button
          type="button"
          onClick={() => zoomAtCenter(1.25)}
          className="rounded-md border border-[#E2E8F0] px-2.5 py-1 text-sm font-medium hover:bg-[#F5F7FA]"
        >
          Perbesar +
        </button>
        <button
          type="button"
          onClick={() => zoomAtCenter(1 / 1.25)}
          className="rounded-md border border-[#E2E8F0] px-2.5 py-1 text-sm font-medium hover:bg-[#F5F7FA]"
        >
          Perkecil −
        </button>
        <button
          type="button"
          onClick={resetView}
          className="rounded-md border border-[#E2E8F0] px-2.5 py-1 text-sm font-medium hover:bg-[#F5F7FA]"
        >
          Atur Ulang
        </button>
        <span className="text-xs text-[#64748B]">{Math.round(zoom * 100)}% · geser untuk pan · klik gambar untuk Tambah Indikasi</span>
      </div>

      <div
        ref={wrapRef}
        className="overflow-hidden rounded-md border border-[#E2E8F0] bg-[#F5F7FA]"
        style={{ cursor: 'crosshair' }}
      >
        <Stage
          ref={stageRef}
          width={stageW}
          height={stageH}
          // Catatan: zoom via scroll/wheel sengaja dimatikan agar scroll
          // halaman tetap natural. Zoom hanya lewat tombol toolbar.
          onMouseDown={(e) => {
            const stage = stageRef.current;
            const p = stage?.getPointerPosition();
            if (!p) return;
            panRef.current = {
              active: true,
              panning: false,
              startX: p.x,
              startY: p.y,
              origX: pos.x,
              origY: pos.y,
              onImage: e.target === imageNodeRef.current,
            };
          }}
          onMouseMove={() => {
            const st = panRef.current;
            if (!st.active) return;
            const stage = stageRef.current;
            const p = stage?.getPointerPosition();
            if (!p) return;
            const dx = p.x - st.startX;
            const dy = p.y - st.startY;
            if (!st.panning && Math.hypot(dx, dy) > 6) st.panning = true;
            if (st.panning) setPos({ x: st.origX + dx, y: st.origY + dy });
          }}
          onMouseUp={() => {
            const st = panRef.current;
            if (st.active && !st.panning && st.onImage) {
              const stage = stageRef.current;
              const p = stage?.getPointerPosition();
              if (p) onCanvasClick(toPercent(p.x, p.y));
            }
            st.active = false;
            st.panning = false;
          }}
          onMouseLeave={() => {
            panRef.current.active = false;
            panRef.current.panning = false;
          }}
        >
          <Layer>
            <Group x={pos.x} y={pos.y} scaleX={k} scaleY={k}>
              {img && <KonvaImage ref={imageNodeRef} image={img} width={natW} height={natH} />}
              {img &&
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
                      onClick={(e) => {
                        e.cancelBubble = true;
                        onSelect(ind.id);
                      }}
                    >
                      {/* Elips lonjong merah — ukuran layar tetap */}
                      <Group x={cx} y={cy} scaleX={invK} scaleY={invK}>
                        {selected && (
                          <Ellipse radiusX={19} radiusY={16} stroke="#0072CE" strokeWidth={2.5} />
                        )}
                        <Ellipse
                          radiusX={14}
                          radiusY={11}
                          fill="#DC2626"
                          fillOpacity={0.25}
                          stroke="#DC2626"
                          strokeWidth={2}
                        />
                        <Text
                          text={String(i + 1)}
                          fontSize={12}
                          fontStyle="bold"
                          fill="#FFFFFF"
                          stroke="#7F1D1D"
                          strokeWidth={0.8}
                          width={30}
                          x={-15}
                          y={-7}
                          align="center"
                        />
                      </Group>
                      {/* Label Panjang (nilai persis tersimpan) di sisi atas */}
                      <DimLabel x={cx} y={cy - 11 * invK} invK={invK} text={String(ind.panjang_mm)} align="center" />
                      {/* Label Lebar (nilai persis tersimpan) di sisi kiri */}
                      <DimLabel x={cx - 14 * invK} y={cy} invK={invK} text={String(ind.lebar_mm)} align="right" />
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
