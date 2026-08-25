import { Link, useLocation } from "@/lib/router-compat";
import { LayoutDashboard, ShoppingCart, Package, Wallet, ListOrdered, Settings, LifeBuoy, Shield, LogOut, Rocket, Sparkles, X, ChevronDown, Code2 } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency, CURRENCIES } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SidebarProps { onClose?: () => void; }

const userNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Rocket, label: 'Full Engagement', path: '/engagement-order', highlight: true },
  { icon: Sparkles, label: 'Engagement Orders', path: '/engagement-orders' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: Code2, label: 'API Access', path: '/api-access' },
  { icon: LifeBuoy, label: 'Support', path: '/support' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const adminNavItems = [{ icon: Shield, label: 'Admin Panel', path: '/admin' }];

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { isAdmin, signOut, wallet, profile } = useAuth();
  const { currency, setCurrency, formatPrice, currencyInfo } = useCurrency();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  return (
    <div className="h-full w-full overflow-hidden flex flex-col" style={{ background: '#fff', borderRight: '1px solid #f0e8ef' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="FlexiPro platform logo" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight leading-tight" style={{ color: '#1a1a2e' }}>FlexiPro</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] leading-tight" style={{ background: 'linear-gradient(90deg, #2563EB, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>✦ Updated Version</span>
          </div>
        </Link>
        <button onClick={onClose} aria-label="Close sidebar" className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: '#ccc' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      {profile && (
          <div className="mx-4 mb-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: '#2563EB' }}>
            {profile.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold truncate" style={{ color: '#1a1a2e' }}>{profile.full_name || 'User'}</p>
            <p className="text-[10px] truncate" style={{ color: '#aaa' }}>{profile.email}</p>
          </div>
        </div>
      )}

      {/* Wallet */}
        <div className="mx-4 mb-4">
        <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1px solid #BFDBFE' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wallet className="w-3 h-3" style={{ color: '#2563EB' }} />
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#2563EB' }}>Wallet Balance</span>
          </div>
          <p className="text-[22px] font-extrabold tracking-tight mb-3" style={{ color: '#1a1a2e' }}>{formatPrice(wallet?.balance || 0)}</p>
          <Link to="/wallet" onClick={onClose} className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg text-[11px] font-semibold text-white" style={{ background: '#2563EB' }}>
            <Wallet className="w-3 h-3" /> Add Funds
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
        <p className="px-3 mb-2 text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#ccc' }}>Menu</p>
        {userNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={onClose}
              className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium mb-0.5 transition-all duration-150',
                isActive ? 'font-semibold' : 'hover:bg-blue-50/60'
              )}
              style={{
                background: isActive ? '#EFF6FF' : 'transparent',
                color: isActive ? '#9d174d' : '#666',
                border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
              }}
            >
              <item.icon className="w-4 h-4" style={{ color: isActive ? '#2563EB' : '#bbb' }} />
              <span className="flex-1">{item.label}</span>
              {(item as any).highlight && !isActive && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#DBEAFE', color: '#2563EB' }}>HOT</span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 mx-3" style={{ borderTop: '1px solid #f5f0f4' }} />
            <p className="px-3 mb-2 text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#ccc' }}>Admin</p>
            {adminNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path} onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium mb-0.5 transition-all duration-150"
                  style={{
                    background: isActive ? '#fef2f2' : 'transparent',
                    color: isActive ? '#dc2626' : '#666',
                    border: isActive ? '1px solid #fecaca' : '1px solid transparent',
                  }}
                >
                  <item.icon className="w-4 h-4" style={{ color: isActive ? '#ef4444' : '#bbb' }} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Currency */}
      <div className="px-3 pb-2">
        <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[12px] font-medium" style={{ color: '#888', background: '#fafafa', border: '1px solid #f0e8ef' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">🇮🇳</span>
            <span className="uppercase tracking-wider">INR</span>
          </div>
          <span className="text-[10px] opacity-60">₹</span>
        </div>
      </div>

      {/* Telegram */}
      <div className="px-3 pb-1">
        <a href="https://t.me/BMG009" target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-colors hover:bg-blue-50/60"
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB' }}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          <div className="flex flex-col">
            <span className="font-semibold text-[11px]" style={{ color: '#C53078' }}>Join our Telegram</span>
            <span className="text-[10px]" style={{ color: '#93C5FD' }}>Updates & support</span>
          </div>
        </a>
      </div>

      {/* Sign out */}
      <div className="p-3" style={{ borderTop: '1px solid #f5f0f4' }}>
        <button onClick={() => signOut()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors hover:bg-red-50" style={{ color: '#aaa' }}>
          <LogOut className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
