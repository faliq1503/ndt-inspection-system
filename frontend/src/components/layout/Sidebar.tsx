import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';

const MENU = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/inspection/new', label: 'New Inspection' },
  { to: '/inspection/history', label: 'Inspection History' },
];

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  function handleLogout() {
    dispatch(logout());
    navigate('/login', { replace: true });
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 rounded-lg border border-[#E2E8F0] bg-white p-3 md:flex">
      <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
        {MENU.map((m) => (
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
        <p className="px-3 text-xs text-[#64748B]">User Profile</p>
        <p className="truncate px-3 py-1 text-sm font-semibold">{user?.username ?? '-'}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[#DC2626] hover:bg-[#F5F7FA]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
