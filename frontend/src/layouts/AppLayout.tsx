import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

/**
 * Layout global setelah login: Header + Sidebar + Main Content.
 * - Desktop (md ke atas): sidebar di kiri, bisa disembunyikan.
 * - Layar kecil: sidebar jadi drawer yang dibuka dari tombol menu di header.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Tutup drawer dengan Escape + kunci scroll halaman selama drawer terbuka
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-ndt-bg text-ndt-text">
      <Header onOpenMenu={() => setDrawerOpen(true)} />

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <Sidebar variant="drawer" onClose={() => setDrawerOpen(false)} onNavigate={() => setDrawerOpen(false)} />
          <button
            type="button"
            aria-label="Tutup menu"
            className="flex-1 bg-ndt-text/40"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      )}

      <div className="mx-auto flex max-w-[1400px] gap-4 px-3 py-4 sm:px-4">
        {sidebarOpen ? (
          <Sidebar onClose={() => setSidebarOpen(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Tampilkan menu"
            title="Tampilkan menu"
            className="sticky top-4 hidden h-fit shrink-0 self-start rounded-lg border border-ndt-border bg-white p-2.5 text-ndt-muted hover:bg-ndt-bg hover:text-ndt-primary md:block"
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
