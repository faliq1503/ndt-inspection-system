import { useState } from 'react';
import type { ReactNode } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

/** Layout global setelah login: Header + Sidebar (dapat ditutup) + Main Content. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggle = () => setSidebarOpen((v) => !v);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033]">
      <Header />
      <div className="mx-auto flex max-w-[1400px] gap-4 px-4 py-4">
        {sidebarOpen ? (
          <Sidebar onClose={() => setSidebarOpen(false)} />
        ) : (
          <button
            type="button"
            onClick={toggle}
            aria-label="Buka sidebar"
            title="Buka sidebar"
            className="hidden h-fit shrink-0 rounded-lg border border-[#E2E8F0] bg-white p-2.5 text-[#64748B] hover:bg-[#F5F7FA] hover:text-[#0072CE] md:block"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
