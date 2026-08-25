import { useMemo } from 'react';
import { useLocation } from "@/lib/router-compat";
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { MaintenancePage } from '@/components/MaintenanceMode';

interface GlobalSubscriptionGuardProps {
  children: React.ReactNode;
}

// Routes that stay reachable during maintenance (admins need to log in + toggle it off)
const MAINTENANCE_ALLOWED_ROUTES = ['/auth'];

/**
 * ZERO-BLOCKING GLOBAL GUARD
 * NEVER shows a loading spinner - renders children immediately
 * Only blocks rendering for maintenance mode (non-admin users)
 */
export function GlobalSubscriptionGuard({ children }: GlobalSubscriptionGuardProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { isMaintenanceMode } = useMaintenanceMode();

  const isAllowedRoute = useMemo(
    () => MAINTENANCE_ALLOWED_ROUTES.includes(location.pathname),
    [location.pathname]
  );
  const isAdminRoute = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname]);

  // Maintenance mode: show maintenance page everywhere (incl. landing page) except /auth + /admin
  if (isMaintenanceMode && !isAdmin && !isAdminRoute && !isAllowedRoute) {
    return <MaintenancePage />;
  }


  // ALWAYS render children instantly - no loading spinner ever
  return <>{children}</>;
}
