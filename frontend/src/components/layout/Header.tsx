import { Link } from 'react-router-dom';
import plnLogo from '../../assets/PLN_logo_QC.png';

/** Header global: branding + navigasi ringkas untuk layar kecil. */
export default function Header() {
  return (
    <header className="border-b border-[#E2E8F0] bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
        <img src={plnLogo} alt="PLN" className="h-9 w-auto" />
        <div>
          <p className="text-[15px] font-semibold leading-tight text-[#172033]">
            NDT Inspection System
          </p>
          <p className="text-xs leading-tight text-[#64748B]">Dasbor Inspeksi Industrial</p>
        </div>
        <nav className="ml-auto flex gap-1 md:hidden" aria-label="Navigasi ringkas">
          <Link className="rounded px-2 py-1 text-sm text-[#0072CE]" to="/dashboard">
            Dasbor
          </Link>
          <Link className="rounded px-2 py-1 text-sm text-[#0072CE]" to="/inspection/new">
            Baru
          </Link>
          <Link className="rounded px-2 py-1 text-sm text-[#0072CE]" to="/inspection/history">
            Riwayat
          </Link>
        </nav>
      </div>
    </header>
  );
}
