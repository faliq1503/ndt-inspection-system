export default function Loading({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-ndt-border bg-white p-6" role="status" aria-live="polite">
      <p className="animate-pulse text-sm text-ndt-muted">{label}</p>
    </div>
  );
}
