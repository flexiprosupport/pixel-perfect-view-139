import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import logo from '@/assets/logo.jpg';

export function MobileBottomNav() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 lg:hidden">
        <div className="flex items-center justify-between h-14 px-4" style={{ background: 'rgba(250,250,248,.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ border: '1px solid rgba(0,0,0,.08)' }}>
            <Menu className="w-4 h-4" style={{ color: '#555' }} />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="FlexiPro platform logo" className="w-7 h-7 rounded-md object-cover" />
            <span className="text-[14px] font-bold tracking-tight" style={{ color: '#1a1a2e' }}>FlexiPro</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden shadow-xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
