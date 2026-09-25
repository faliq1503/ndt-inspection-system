export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-[#DC2626]/30 bg-white p-6" role="alert">
      <p className="text-sm text-[#DC2626]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-[#E2E8F0] px-3 py-1.5 text-sm font-medium text-[#172033] hover:bg-[#F5F7FA]"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
