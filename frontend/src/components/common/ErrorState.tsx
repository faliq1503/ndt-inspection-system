export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-ndt-danger/30 bg-white p-6" role="alert">
      <p className="text-sm text-ndt-danger">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-ndt-border px-3 py-1.5 text-sm font-medium text-ndt-text hover:bg-ndt-bg"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
