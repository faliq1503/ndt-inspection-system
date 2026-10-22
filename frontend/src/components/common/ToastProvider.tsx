import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toastContext';
import type { ToastApi, ToastTone } from './toastContext';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const DURATION_MS = 3500;
const MAX_VISIBLE = 4;

const TONE_STYLES: Record<ToastTone, { box: string; icon: string; symbol: string }> = {
  success: { box: 'border-ndt-success/30 text-ndt-success', icon: 'bg-ndt-success', symbol: '✓' },
  error: { box: 'border-ndt-danger/30 text-ndt-danger', icon: 'bg-ndt-danger', symbol: '!' },
  info: { box: 'border-ndt-primary/30 text-ndt-primary', icon: 'bg-ndt-primary', symbol: 'i' },
};

function Toast({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onClose(item.id), DURATION_MS);
    return () => clearTimeout(t);
  }, [item.id, onClose]);

  const style = TONE_STYLES[item.tone];
  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      className={`animate-toast-in pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border bg-white px-4 py-3 text-sm font-medium shadow-[0_8px_24px_rgba(23,32,51,0.12)] sm:w-auto sm:min-w-72 sm:max-w-md ${style.box}`}
    >
      <span
        aria-hidden="true"
        className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${style.icon}`}
      >
        {style.symbol}
      </span>
      <span className="min-w-0 flex-1 text-ndt-text">{item.message}</span>
      <button
        type="button"
        onClick={() => onClose(item.id)}
        aria-label="Tutup notifikasi"
        className="-mr-1 rounded p-0.5 text-ndt-muted hover:bg-ndt-bg hover:text-ndt-text"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

/** Penyedia notifikasi toast global, ditampilkan di pojok kanan bawah. */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const show = (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, message, tone }].slice(-MAX_VISIBLE));
    };
    return {
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end print:hidden"
      >
        {items.map((t) => (
          <Toast key={t.id} item={t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
