import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Search, ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type AuditRow = {
  id: string;
  actor_email: string | null;
  target_email: string | null;
  target_user_id: string | null;
  action: string;
  amount_usd: number | null;
  amount_inr: number | null;
  notes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export default function AdminAuditLog() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
    refetchInterval: 60000,
  });

  const filtered = (data ?? []).filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.actor_email?.toLowerCase().includes(s) ||
      r.target_email?.toLowerCase().includes(s) ||
      r.ip_address?.toLowerCase().includes(s) ||
      r.action.toLowerCase().includes(s)
    );
  });

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              Har admin deposit/withdrawal yahaan record hota hai — IP, time, actor sab visible.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Email, IP, ya action se search karo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading ? 'Loading…' : `${filtered.length} record${filtered.length === 1 ? '' : 's'}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading audit log…
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                Koi audit record nahi mila.
              </p>
            )}

            {filtered.map((row) => {
              const isDeposit = row.action === 'wallet_deposit';
              return (
                <div
                  key={row.id}
                  className="rounded-xl border bg-card p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isDeposit ? 'bg-blue-500/15 text-blue-600' : 'bg-amber-500/15 text-amber-600'
                    }`}
                  >
                    {isDeposit ? (
                      <ArrowDownToLine className="h-5 w-5" />
                    ) : (
                      <ArrowUpFromLine className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isDeposit ? 'default' : 'secondary'} className="capitalize">
                        {row.action.replace('wallet_', '')}
                      </Badge>
                      <span className="text-sm font-semibold">
                        ₹{Number(row.amount_inr ?? 0).toFixed(2)}{' '}
                        <span className="text-xs text-muted-foreground">
                          (${Number(row.amount_usd ?? 0).toFixed(4)})
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <b className="text-foreground">Actor:</b> {row.actor_email ?? '—'}{' '}
                      &nbsp;→&nbsp; <b className="text-foreground">Target:</b>{' '}
                      {row.target_email ?? row.target_user_id ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      <b className="text-foreground">IP:</b> {row.ip_address ?? '—'}
                      {row.notes ? <> · <b className="text-foreground">Notes:</b> {row.notes}</> : null}
                    </p>
                    {row.user_agent && (
                      <p className="text-[10px] text-muted-foreground truncate" title={row.user_agent}>
                        UA: {row.user_agent}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground md:text-right shrink-0">
                    {format(new Date(row.created_at), 'dd MMM yyyy, HH:mm:ss')}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}