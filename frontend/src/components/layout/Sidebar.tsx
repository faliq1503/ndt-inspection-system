import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';

const MENU = [
  { to: '/dashboard', label: 'Dasbor' },
  { to: '/inspection/new', label: 'Inspeksi Baru' },
  { to: '/inspection/history', label: 'Riwayat Inspeksi' },
];

const ADMIN_MENU = [
  { to: '/admin/standards', label: 'Kelola Standar' },
  { to: '/admin/users', label: 'Kelola Pengguna' },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const menu = user?.role === 'admin' ? [...MENU, ...ADMIN_MENU] : MENU;

  function handleLogout() {
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 rounded-lg border border-[#E2E8F0] bg-white p-3 md:flex">
      <div className="mb-1 flex items-center justify-between">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Menu</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup sidebar"
            title="Tutup sidebar"
            className="rounded-md p-1.5 text-[#64748B] hover:bg-[#F5F7FA] hover:text-[#172033]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
        {menu.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-[#E8F4FC] text-[#0072CE]'
                  : 'text-[#64748B] hover:bg-[#F5F7FA] hover:text-[#172033]'
              }`
            }
          >
            {m.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-[#E2E8F0] pt-3">
        <p className="px-3 text-xs text-[#64748B]">Profil Pengguna</p>
        <p className="truncate px-3 py-1 text-sm font-semibold">{user?.username ?? '-'}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[#DC2626] hover:bg-[#F5F7FA]"
        >
          Keluar
        </button>
      </div>
    </aside>
  );
}
