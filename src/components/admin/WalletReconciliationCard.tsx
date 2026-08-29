import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import { toast } from 'sonner';
import {
  listWalletReconciliationFn,
  runWalletReconciliationFn,
} from '@/lib/reconcile.functions';

/** Daily wallet-vs-ledger reconciliation results, plus a manual trigger. */
export function WalletReconciliationCard() {
  const list = useServerFn(listWalletReconciliationFn);
  const run = useServerFn(runWalletReconciliationFn);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['wallet-reconciliation'],
    queryFn: async () => await list(),
    staleTime: 60_000,
  });

  const latest = data?.[0];
  const mismatches = (latest?.mismatches as unknown as Record<string, string | number>[]) ?? [];

  const trigger = async () => {
    setBusy(true);
    try {
      const res = await run();
      toast[res.mismatch_count > 0 ? 'warning' : 'success'](
        res.mismatch_count > 0
          ? `${res.mismatch_count} wallet(s) mismatched (drift ${res.total_drift})`
          : `All ${res.wallets_checked} wallets match the ledger`,
      );
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reconciliation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4" /> Wallet ledger reconciliation
          <span className="text-xs font-normal text-muted-foreground">daily 01:30 UTC</span>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => void trigger()} disabled={busy}>
          {busy ? 'Running…' : 'Run now'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !latest ? (
          <p className="text-sm text-muted-foreground">
            No reconciliation run yet — trigger one to compare wallet balances with transactions.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {latest.mismatch_count > 0 ? (
                <Badge className="gap-1 bg-amber-500/15 text-amber-500">
                  <AlertTriangle className="h-3 w-3" /> {latest.mismatch_count} mismatch(es)
                </Badge>
              ) : (
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> Balanced
                </Badge>
              )}
              <span className="text-muted-foreground">
                {latest.wallets_checked} wallets · drift {latest.total_drift} ·{' '}
                {new Date(latest.run_at).toLocaleString()}
              </span>
            </div>
            {mismatches.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto text-xs">
                {mismatches.slice(0, 25).map((m, i) => (
                  <div key={i} className="rounded-lg border p-2">
                    <span className="font-mono">{String(m['user_id'])}</span> — wallet{' '}
                    {String(m['wallet_balance'])} vs ledger {String(m['ledger_balance'])} (drift{' '}
                    {String(m['drift'])})
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
