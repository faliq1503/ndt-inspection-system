import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  /** lg: kontrol lebih tinggi untuk form fokus (mis. login). Default md. */
  controlSize?: 'md' | 'lg';
  /** Ikon dekoratif di sisi kiri dalam input (mis. user/lock). */
  leftIcon?: ReactNode;
}

/** Input berlabel (aksesibilitas spec §28: semua input memiliki label). */
export default function Input({ label, hint, id, controlSize = 'md', leftIcon, ...rest }: Props) {
  const inputId = id ?? `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const sizeClass =
    controlSize === 'lg'
      ? 'h-[52px] rounded-xl px-4 text-[15px] min-[900px]:h-12'
      : 'rounded-md px-3 py-2 text-sm';
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[#172033]">
        {label}
      </label>
      <div className="relative">
        {leftIcon && (
          <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          {...rest}
          className={`w-full border border-[#D0D9EA] bg-white text-[#172033] placeholder:text-[#64748B]/70 focus:border-[#0072CE] focus:outline-none focus:ring-[3px] focus:ring-[#0072CE]/15 ${sizeClass} ${leftIcon ? 'pl-11' : ''} ${rest.className ?? ''}`}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-[#64748B]">{hint}</p>}
    </div>
  );
}
