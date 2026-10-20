import type { ReactNode } from 'react';
import type { EvaluationStatus } from '../../types/index';
import { displayStatus } from '../../utils/format';

export type BadgeTone = 'success' | 'danger' | 'neutral' | 'warning' | 'info';

const TONE_STYLES: Record<BadgeTone, string> = {
  success: 'bg-ndt-success/10 text-ndt-success',
  danger: 'bg-ndt-danger/10 text-ndt-danger',
  neutral: 'bg-ndt-muted/10 text-ndt-muted',
  warning: 'bg-ndt-warning/15 text-ndt-warning-dark',
  info: 'bg-ndt-info/10 text-ndt-info',
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
