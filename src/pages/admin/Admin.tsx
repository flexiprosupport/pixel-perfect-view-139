import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { QueueHealthWidget } from '@/components/admin/QueueHealthWidget';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  Activity,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  LayoutDashboard,
  Clock,
  CreditCard,
  MessageCircle,
  Globe,
  Percent,
  Save,
  Loader2,
  TrendingDown,
  ShieldAlert,
  Megaphone,
  Radio,
} from 'lucide-react';
import { Link, Navigate } from "@/lib/router-compat";
import { toast } from 'sonner';

export default function Admin() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);

  // Optimized Dashboard Stats fetch
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats' as any);
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 60000,
    staleTime: 60000,
    refetchOnWindowFocus: false,

  });

  useEffect(() => {
    if (dashboardStats && !maintenanceLoaded) {
      setMaintenanceMode(Boolean(dashboardStats.maintenance_mode));
      setMaintenanceLoaded(true);
    }
  }, [dashboardStats, maintenanceLoaded]);

  // Maintenance mode toggle mutation
  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: existing } = await supabase.from('platform_settings').select('id').limit(1).maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ maintenance_mode: enabled, updated_at: new Date().toISOString() } as any)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({ maintenance_mode: enabled } as any);
        if (error) throw error;
      }
    },

    onSuccess: (_, enabled) => {
      toast.success(enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });

    },
    onError: (err: Error, enabled) => {
      setMaintenanceMode(!enabled); // revert optimistic switch
      toast.error(err.message);
    },

  });

  // INSTANT RENDER - No blocking loader, redirect in useEffect if needed

  const totalRevenue = dashboardStats?.total_revenue || 0;
  const totalOrders = dashboardStats?.total_orders || 0;
  const userCount = dashboardStats?.user_count || 0;
  const serviceCount = dashboardStats?.service_count || 0;
  const totalDepositsUsd = Number(dashboardStats?.total_deposits || 0);
  const totalWalletUsd = Number(dashboardStats?.total_wallet_balance || 0);
  const depositsTodayUsd = Number(dashboardStats?.deposits_today || 0);
  const depositsCount = Number(dashboardStats?.deposits_count || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 px-2 sm:px-4 lg:px-6 pb-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden glass-card p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-transparent to-accent/10">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl shadow-primary/20">
                <LayoutDashboard className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Admin Control Center
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Complete platform management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                <Activity className="h-3 w-3" />
                System Online
              </Badge>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Total User Deposits — Hero Stat */}
        <Card className="glass-card relative overflow-hidden border-2 border-success/30">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-success/5" />
          <CardContent className="p-5 sm:p-6 relative">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success to-success/60 flex items-center justify-center shadow-xl shadow-success/20 shrink-0">
                  <CreditCard className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total User Deposits (All Time)</p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-success">
                    ₹{(totalDepositsUsd * 90).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {depositsCount} successful deposits · auto-refresh every 15s
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 min-w-[220px]">
                <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Today</p>
                  <p className="text-lg font-bold text-success">₹{(depositsTodayUsd * 90).toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Balance</p>
                  <p className="text-lg font-bold text-primary">₹{(totalWalletUsd * 90).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        {/* Maintenance Mode Toggle */}
        <Card className={`glass-card border-2 relative overflow-hidden transition-all ${maintenanceMode ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shrink-0 transition-colors ${maintenanceMode ? 'bg-gradient-to-br from-destructive to-destructive/60 shadow-destructive/20' : 'bg-gradient-to-br from-muted to-muted/60 shadow-muted/20'}`}>
                  <AlertTriangle className={`h-7 w-7 ${maintenanceMode ? 'text-destructive-foreground' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Maintenance Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    {maintenanceMode
                      ? 'Site is currently in maintenance — users see a waiting page'
                      : 'Turn on to show a maintenance page to all users while you update'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${maintenanceMode ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {maintenanceMode ? 'ON' : 'OFF'}
                </span>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={(checked) => {
                    setMaintenanceMode(checked);
                    toggleMaintenanceMutation.mutate(checked);
                  }}
                  disabled={toggleMaintenanceMutation.isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Health Widget */}
        <QueueHealthWidget />

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/bundles">
            <Card className="glass-card h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group border-2 border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        Bundles
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-primary">NEW</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Engagement combos</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/users">
            <Card className="glass-card h-full hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-accent transition-colors">
                      Users
                    </h3>
                    <p className="text-xs text-muted-foreground">Manage accounts</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/cron-monitor">
            <Card className="glass-card h-full hover:border-warning/50 hover:shadow-lg hover:shadow-warning/10 transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-warning transition-colors">
                        Cron Monitor
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-warning text-warning-foreground">LIVE</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Real-time status</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-warning transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>


          <Link to="/admin/provider-accounts">
            <Card className="glass-card h-full hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all cursor-pointer group border-2 border-accent/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Globe className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-accent transition-colors">
                        Provider Accounts
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-accent text-accent-foreground">NEW</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">API keys & URLs</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/topup-plan">
            <Card className="glass-card h-full hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all cursor-pointer group border-2 border-orange-500/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/30 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CreditCard className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-orange-500 transition-colors">
                        Top-up Plan
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-orange-500 text-white">NEW</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Per-provider ₹ to add</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/service-provider-mapping">
            <Card className="glass-card h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group border-2 border-primary/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        Service Mapping
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-primary">NEW</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Failover & Rotation</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/deposits">
            <Card className="glass-card h-full hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer group border-2 border-amber-500/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CreditCard className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-amber-500 transition-colors">
                        Deposit Requests
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-amber-500 text-amber-500-foreground">PENDING</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Approve Razorpay payments</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/audit-log">
            <Card className="glass-card h-full hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all cursor-pointer group border-2 border-red-500/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/30 to-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShieldAlert className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-red-500 transition-colors">
                        Admin Audit Log
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white">NEW</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">IP + actor for every wallet action</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/support">
            <Card className="glass-card h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group border-2 border-primary/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShieldAlert className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      Support Tickets
                    </h3>
                    <p className="text-xs text-muted-foreground">Reply, update status, full timeline</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>



          <Link to="/admin/oxapay-events">
            <Card className="glass-card h-full hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all cursor-pointer group border-2 border-orange-500/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/30 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShieldAlert className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-orange-500 transition-colors">
                        OxaPay Webhook Events
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-orange-500 text-white">NEW</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Signature, replays &amp; credit outcome</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/popup-ad">
            <Card className="glass-card h-full hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all cursor-pointer group border-2 border-orange-500/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/30 to-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Megaphone className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-orange-500 transition-colors">
                        Popup Ad
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-orange-500 text-white">NEW</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">YouTube popup on engagement pages</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

        </div>
      </div>
    </DashboardLayout>
  );
}
