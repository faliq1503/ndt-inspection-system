import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';

/** Ikon outline konsisten untuk menu sidebar (inline SVG, tanpa lib baru). */
function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function DashboardIcon() {
  return (
    <MenuIcon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </MenuIcon>
  );
}

function NewInspectionIcon() {
  return (
    <MenuIcon>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </MenuIcon>
  );
}

function HistoryIcon() {
  return (
    <MenuIcon>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </MenuIcon>
  );
}

function StandardIcon() {
  return (
    <MenuIcon>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </MenuIcon>
  );
}

function UsersIcon() {
  return (
    <MenuIcon>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </MenuIcon>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

interface MenuItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const MENU: MenuItem[] = [
  { to: '/dashboard', label: 'Dasbor', icon: <DashboardIcon /> },
  { to: '/inspection/new', label: 'Inspeksi Baru', icon: <NewInspectionIcon /> },
  { to: '/inspection/history', label: 'Riwayat Inspeksi', icon: <HistoryIcon /> },
];

const ADMIN_MENU: MenuItem[] = [
  { to: '/admin/standards', label: 'Kelola Standar', icon: <StandardIcon /> },
  { to: '/admin/users', label: 'Kelola Pengguna', icon: <UsersIcon /> },
];

function MenuLink({ item }: { item: MenuItem }) {
  return (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-[#E8F4FC] font-semibold text-[#0072CE]'
            : 'text-[#64748B] hover:bg-[#F5F7FA] hover:text-[#172033]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-[#0072CE]"
            />
          )}
          {item.icon}
          {item.label}
        </>
      )}
    </NavLink>
  );
}

/** Inisial untuk avatar (2 huruf pertama, uppercase). */
function initials(name: string): string {
  const clean = name.trim();
  if (!clean) return '-';
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'admin';
  const username = user?.username ?? '-';

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
        {MENU.map((m) => (
          <MenuLink key={m.to} item={m} />
        ))}
      </nav>
      {isAdmin && (
        <>
          <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Administrasi
          </p>
          <nav className="flex flex-col gap-1" aria-label="Navigasi administrasi">
            {ADMIN_MENU.map((m) => (
              <MenuLink key={m.to} item={m} />
            ))}
          </nav>
        </>
      )}
      <div className="mt-auto border-t border-[#E2E8F0] pt-3">
        <div className="flex items-center gap-2.5 px-3 py-1">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F4FC] text-sm font-bold text-[#0072CE]"
          >
            {initials(username)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#172033]">{username}</p>
            <p className="text-xs capitalize text-[#64748B]">{user?.role ?? '-'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-[#64748B] hover:bg-[#DC2626]/10 hover:text-[#DC2626]"
        >
          <LogoutIcon />
          Keluar
        </button>
      </div>
    </aside>
  );
}
