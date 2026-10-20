import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'neutral' | 'primary' | 'danger' | 'success';

const TONE_HOVER: Record<Tone, string> = {
  neutral: 'hover:bg-ndt-bg hover:text-ndt-text',
  primary: 'hover:bg-ndt-primary-light hover:text-ndt-primary',
  danger: 'hover:bg-ndt-danger/10 hover:text-ndt-danger',
  success: 'hover:bg-ndt-success/10 hover:text-ndt-success',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Wajib: dipakai sebagai tooltip dan aria-label (tombol tanpa teks). */
  label: string;
  tone?: Tone;
  children: ReactNode;
}

/** Tombol aksi ringkas berupa ikon saja, untuk kolom Aksi di tabel. */
export default function IconButton({ label, tone = 'neutral', children, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      title={rest.title ?? label}
      aria-label={label}
      {...rest}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-ndt-border bg-white text-ndt-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-ndt-muted ${TONE_HOVER[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
