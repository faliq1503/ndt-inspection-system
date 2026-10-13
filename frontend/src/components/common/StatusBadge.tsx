import type { ReactNode } from 'react';
import type { EvaluationStatus } from '../../types/index';
import { displayStatus } from '../../utils/format';

export type BadgeTone = 'success' | 'danger' | 'neutral' | 'warning' | 'info';

const TONE_STYLES: Record<BadgeTone, string> = {
  success: 'bg-[#16A34A]/10 text-[#16A34A]',
  danger: 'bg-[#DC2626]/10 text-[#DC2626]',
  neutral: 'bg-[#64748B]/10 text-[#64748B]',
  warning: 'bg-[#F59E0B]/15 text-[#B45309]',
  info: 'bg-[#0284C7]/10 text-[#0284C7]',
};

/**
 * Badge generik: teks + warna + ikon opsional (jangan warna saja).
 * Padding, radius, ukuran teks, dan ketebalan font seragam.
 */
export function Badge({
  tone,
  label,
  icon,
  title,
}: {
  tone: BadgeTone;
  label: string;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE_STYLES[tone]}`}
      title={title ?? label}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {label}
    </span>
  );
}

/**
 * Badge status ACC/REJECT.
 * Backend "ACCEPT" ditampilkan sebagai "ACC" sesuai spec.
 */
export default function StatusBadge({ status }: { status: EvaluationStatus | null | undefined }) {
  if (status === 'ACCEPT') {
    return <Badge tone="success" label={displayStatus(status)} icon="✓" title={status} />;
  }
  if (status === 'REJECT') {
    return <Badge tone="danger" label={displayStatus(status)} icon="!" title={status} />;
  }
  return <Badge tone="neutral" label="-" />;
}
