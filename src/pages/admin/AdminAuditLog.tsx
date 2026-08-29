import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShieldAlert,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Download,
  FlaskConical,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { adminWalletSelfTest } from '@/lib/admin-wallet.functions';

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

type SelfTestStep = {
  step: string;
  expected_balance_inr: number;
  actual_balance_inr: number;
  audit_id: string | null;
  passed: boolean;
  error?: string;
};

type SelfTestResult = {
  ran_at: string;
  amount_inr: number;
  passed: boolean;
  steps: SelfTestStep[];
};

function toCsv(rows: AuditRow[]) {
  const header = [
    'id',
    'created_at',
    'action',
    'admin_email',
    'target_email',
    'amount_inr',
    'amount_usd',
    'reason',
    'ip_address',
  ];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.id,
      r.created_at,
      r.action,
      r.actor_email,
      r.target_email ?? r.target_user_id,
      r.amount_inr ?? '',
      r.amount_usd ?? '',
      r.notes,
      r.ip_address,
    ]
      .map(esc)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

export default function AdminAuditLog() {
  const [search, setSearch] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selfTest, setSelfTest] = useState<SelfTestResult | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
    refetchInterval: 60000,
  });

  const runSelfTest = useServerFn(adminWalletSelfTest);
  const selfTestMutation = useMutation({
    mutationFn: async () => (await runSelfTest({ data: { inr_amount: 10 } })) as SelfTestResult,
    onSuccess: (res) => {
      setSelfTest(res);
      res.passed ? toast.success('Self-test passed ✅') : toast.error('Self-test failed ❌');
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actions = useMemo(
    () => Array.from(new Set((data ?? []).map((r) => r.action))).sort(),
    [data],
  );

  const filtered = (data ?? []).filter((r) => {
    const s = search.trim().toLowerCase();
    if (
      s &&
      !(
        r.actor_email?.toLowerCase().includes(s) ||
        r.target_email?.toLowerCase().includes(s) ||
        r.ip_address?.toLowerCase().includes(s) ||
        r.notes?.toLowerCase().includes(s) ||
        r.action.toLowerCase().includes(s)
      )
    )
      return false;
    if (actorEmail.trim() && !r.actor_email?.toLowerCase().includes(actorEmail.trim().toLowerCase()))
      return false;
    if (
      targetEmail.trim() &&
      !r.target_email?.toLowerCase().includes(targetEmail.trim().toLowerCase())
    )
      return false;
    if (actionFilter !== 'all' && r.action !== actionFilter) return false;
    const ts = new Date(r.created_at).getTime();
    if (fromDate && ts < new Date(`${fromDate}T00:00:00`).getTime()) return false;
    if (toDate && ts > new Date(`${toDate}T23:59:59`).getTime()) return false;
    return true;
  });

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error('Export ke liye koi record nahi hai');
      return;
    }
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flexipro-audit-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} records exported`);
  };

  const resetFilters = () => {
    setSearch('');
    setActorEmail('');
    setTargetEmail('');
    setActionFilter('all');
    setFromDate('');
    setToDate('');
  };

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
              Har admin credit/debit yahaan record hota hai — actor, target, reason, IP aur time.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Search &amp; filters</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset
              </Button>
              <Button size="sm" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Email, IP, reason ya action se search karo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Admin email</Label>
                <Input value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} placeholder="admin@…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target email</Label>
                <Input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="user@…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Action</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {actions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">From date</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To date</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> Live Add/Subtract self-test
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => selfTestMutation.mutate()} disabled={selfTestMutation.isPending}>
              {selfTestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Run test (₹10)
            </Button>
          </CardHeader>
          <CardContent>
            {!selfTest ? (
              <p className="text-xs text-muted-foreground">
                Test aapke apne wallet par ₹10 add karke turant subtract karta hai aur dono audit rows return karta hai.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {selfTest.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-medium">{selfTest.passed ? 'All steps passed' : 'Test failed'}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(selfTest.ran_at), 'dd MMM yyyy, HH:mm:ss')}
                  </span>
                </div>
                {selfTest.steps.map((s, i) => (
                  <div key={i} className="rounded-xl border p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={s.passed ? 'default' : 'destructive'}>{s.passed ? 'PASS' : 'FAIL'}</Badge>
                      <span className="font-semibold">{s.step}</span>
                    </div>
                    <p>
                      Expected: ₹{s.expected_balance_inr.toFixed(2)} · Actual: ₹{s.actual_balance_inr.toFixed(2)}
                    </p>
                    <p className="break-all text-muted-foreground">Audit row: {s.audit_id ?? '—'}</p>
                    {s.error && <p className="text-destructive">{s.error}</p>}
                  </div>
                ))}
              </div>
            )}
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
              const isCredit = row.action === 'wallet_credit' || row.action === 'wallet_deposit';
              return (
                <div
                  key={row.id}
                  className="rounded-xl border bg-card p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isCredit ? 'bg-blue-500/15 text-blue-600' : 'bg-amber-500/15 text-amber-600'
                    }`}
                  >
                    {isCredit ? (
                      <ArrowDownToLine className="h-5 w-5" />
                    ) : (
                      <ArrowUpFromLine className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isCredit ? 'default' : 'secondary'} className="capitalize">
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
                      {row.notes ? <> · <b className="text-foreground">Reason:</b> {row.notes}</> : null}
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
