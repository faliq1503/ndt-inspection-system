import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastApi {
  /** Tampilkan notifikasi singkat (hilang otomatis). */
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Akses notifikasi toast global. Harus dipakai di dalam <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam <ToastProvider>.');
  return ctx;
}
