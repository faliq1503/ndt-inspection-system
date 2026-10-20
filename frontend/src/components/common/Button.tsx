import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'destructive';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  loadingText?: string;
}

const STYLES: Record<Variant, string> = {
  primary: 'bg-ndt-primary text-white hover:bg-ndt-primary-dark disabled:bg-ndt-primary/50',
  secondary: 'border border-ndt-border bg-white text-ndt-text hover:bg-ndt-primary-light disabled:opacity-50',
  danger: 'bg-ndt-danger text-white hover:bg-ndt-danger/90',
  destructive:
    'border border-ndt-danger/50 bg-white text-ndt-danger hover:bg-ndt-danger/10 disabled:opacity-50',
};

export default function Button({ variant = 'primary', loading = false, loadingText = 'Memuat...', children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={rest.disabled ?? loading}
      className={`inline-flex min-h-[36px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${STYLES[variant]} ${rest.className ?? ''}`}
    >
      {loading ? (
        <>
          <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
