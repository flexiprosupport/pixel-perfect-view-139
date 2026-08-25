import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from "@/lib/router-compat";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Server-verified admin guard.
 * Does NOT trust client-side role — re-checks from DB every time.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setVerified(false);
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        // Direct DB check — not from cached state
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!cancelled) {
          setVerified(!error && !!data);
        }
      } catch {
        if (!cancelled) setVerified(false);
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (isLoading || verified === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 40%, #bbf7d0 70%, #f0fdf4 100%)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 40%, #bbf7d0 70%, #f0fdf4 100%)' }}>
        <div className="text-center p-8 bg-white/80 rounded-2xl shadow-lg max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have admin privileges.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
