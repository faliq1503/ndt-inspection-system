import type { ReactNode } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

/** Layout global setelah login: Header + Sidebar + Main Content (spec §7). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033]">
      <Header />
      <div className="mx-auto flex max-w-[1400px] gap-4 px-4 py-4">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
