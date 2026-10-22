import plnLogo from '../../assets/PLN_logo_QC.png';

/** Header global: branding + tombol menu untuk layar kecil. */
export default function Header({ onOpenMenu }: { onOpenMenu?: () => void }) {
  return (
    <header className="border-b border-ndt-border bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Buka menu"
            title="Buka menu"
            className="-ml-1 rounded-md p-2 text-ndt-text hover:bg-ndt-bg md:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <img src={plnLogo} alt="PLN Pusharlis Quality Control" className="h-10 w-auto sm:h-11" />
        <div className="min-w-0 border-l border-ndt-border pl-3">
          <p className="truncate text-[15px] font-semibold leading-tight text-ndt-text">
            NDT Inspection System
          </p>
          <p className="truncate text-xs leading-tight text-ndt-muted">Dasbor Inspeksi Industrial</p>
        </div>
      </div>
      <div aria-hidden="true" className="h-[3px] bg-ndt-accent" />
    </header>
  );
}
