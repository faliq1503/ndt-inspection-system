import { useEffect } from 'react';
import type { ReactNode } from 'react';

/** Modal generik: overlay click + tombol Escape menutup (aksesibilitas spec §28). */
export default function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg border border-ndt-border bg-white p-5 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ndt-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded px-2 py-1 text-lg leading-none text-ndt-muted hover:bg-ndt-bg"
          >
            ×
          </button>
        </div>
        {children}
        {footer && <div className="mt-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
