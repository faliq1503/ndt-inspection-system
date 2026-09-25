export default function Loading({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-6" role="status" aria-live="polite">
      <p className="animate-pulse text-sm text-[#64748B]">{label}</p>
    </div>
  );
}
