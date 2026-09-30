import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  loadingText?: string;
}

const STYLES: Record<Variant, string> = {
  primary: 'bg-[#0072CE] text-white hover:bg-[#005B9A] disabled:bg-[#0072CE]/50',
  secondary: 'border border-[#E2E8F0] bg-white text-[#172033] hover:bg-[#F5F7FA]',
  danger: 'bg-[#DC2626] text-white hover:bg-[#DC2626]/90',
};

export default function Button({ variant = 'primary', loading = false, loadingText = 'Memuat...', children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={rest.disabled ?? loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${STYLES[variant]} ${rest.className ?? ''}`}
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
