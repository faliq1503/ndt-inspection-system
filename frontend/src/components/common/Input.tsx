import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  /** lg: kontrol lebih tinggi untuk form fokus (mis. login). Default md. */
  controlSize?: 'md' | 'lg';
  /** Ikon dekoratif di sisi kiri dalam input (mis. user/lock). */
  leftIcon?: ReactNode;
  /** Suffix satuan di sisi kanan dalam input (mis. mm). */
  suffix?: string;
}

/** Input berlabel (aksesibilitas spec §28: semua input memiliki label). */
export default function Input({ label, hint, id, controlSize = 'md', leftIcon, suffix, ...rest }: Props) {
  const inputId = id ?? `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const sizeClass =
    controlSize === 'lg'
      ? 'h-[52px] rounded-xl px-4 text-[15px] min-[900px]:h-12'
      : 'rounded-md px-3 py-2 text-sm';
  return (
    <div className="min-w-0">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ndt-text">
        {label}
      </label>
      <div className="relative">
        {leftIcon && (
          <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ndt-muted">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          {...rest}
          className={`w-full border border-ndt-border bg-white text-ndt-text placeholder:text-ndt-muted/70 focus:border-ndt-primary focus:outline-none focus:ring-[3px] focus:ring-ndt-primary/15 read-only:bg-ndt-bg read-only:text-ndt-muted ${sizeClass} ${leftIcon ? 'pl-11' : ''} ${suffix ? 'pr-12' : ''} ${rest.className ?? ''}`}
        />
        {suffix && (
          <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ndt-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ndt-muted">{hint}</p>}
    </div>
  );
}
