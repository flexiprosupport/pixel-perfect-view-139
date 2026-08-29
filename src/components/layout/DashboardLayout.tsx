import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from "@/lib/router-compat";
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { WhatsAppFloatingButton } from '@/components/chat/WhatsAppFloatingButton';
import { PopupAdDialog } from '@/components/PopupAdDialog';

interface DashboardLayoutProps { children: ReactNode; }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 40%, #bbf7d0 70%, #f0fdf4 100%)', color: '#1a1a2e' }}>
      <aside className="fixed inset-y-0 left-0 z-40 w-[260px] hidden lg:block">
        <Sidebar />
      </aside>
      <MobileBottomNav />
      <main className="lg:pl-[260px] w-full">
       <div className={`min-h-screen pt-16 lg:pt-0 px-3 sm:px-4 py-4 sm:py-5 lg:p-8 ${isAdmin ? 'text-[13px] leading-5 [&_th]:h-9 [&_th]:py-0 [&_th]:text-[11px] [&_th]:leading-4 [&_td]:py-2.5 [&_td]:text-[13px] [&_td]:leading-5 [&_label]:text-xs [&_label]:leading-4 [&_input]:text-[13px] [&_h1]:text-xl [&_h1]:leading-7 [&_h2]:text-lg [&_h2]:leading-6 [&_h3]:text-base [&_h3]:leading-6 [&_p]:leading-5' : ''}`}>
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </div>
      </main>
      <WhatsAppFloatingButton />
      <PopupAdDialog />
    </div>
  );
}
