import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

/** Input berlabel (aksesibilitas spec §28: semua input memiliki label). */
export default function Input({ label, hint, id, ...rest }: Props) {
  const inputId = id ?? `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-[13px] font-medium text-[#172033]">
        {label}
      </label>
      <input
        id={inputId}
        {...rest}
        className={`w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#172033] placeholder:text-[#64748B]/70 focus:border-[#0072CE] focus:outline-none ${rest.className ?? ''}`}
      />
      {hint && <p className="mt-1 text-xs text-[#64748B]">{hint}</p>}
    </div>
  );
}
