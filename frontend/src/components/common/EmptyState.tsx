import type { ReactNode } from 'react';

export default function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center">
      <p className="text-sm font-medium text-[#172033]">{title}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
