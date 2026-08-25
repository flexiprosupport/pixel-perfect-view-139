import { Fragment, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Copy, RefreshCw, Wallet, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Radio, AlertTriangle } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";

interface PendingRow {
  provider_id: string;
  provider_name: string;
  pending_runs: number;
  pending_user_usd: number;
  markup_percent: number;
}

interface AccountRow {
  id: string;
  provider_id: string;
  name: string;
  balance: number | null;
  balance_currency: string | null;
  is_active: boolean;
}

interface BreakdownRow {
  provider_id: string;
  provider_name: string;
  service_id: string | null;
  service_name: string;
  service_category: string;
  pending_runs: number;
  pending_quantity: number;
  pending_user_usd: number;
}

interface TopUserRow {
  user_id: string;
  email: string;
  full_name: string;
  wallet_balance: number;
  total_deposited: number;
  total_spent: number;
  pending_orders: number;
  pending_value_usd: number;
}

export default function AdminTopupPlan() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const usdToInr = 90; // fixed
  const safetyPct = 0; // no buffer
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: pending, isLoading: pendingLoading, refetch: refetchPending, error: pendingError } = useQuery({
    queryKey: ["topup-plan-pending"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_provider_topup_plan" as any);
      if (error) throw error;
      return (data || []) as PendingRow[];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: accounts, isLoading: accLoading, refetch: refetchAcc, error: accError } = useQuery({
    queryKey: ["topup-plan-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_accounts")
        .select("id, provider_id, name, balance, balance_currency, is_active");
      if (error) throw error;
      return (data || []) as AccountRow[];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: breakdown, refetch: refetchBreakdown } = useQuery({
    queryKey: ["topup-plan-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_provider_topup_breakdown" as any);
      if (error) throw error;
      return (data || []) as BreakdownRow[];
    },
    staleTime: 0,
    refetchInterval: 60000, // poll every 60s as fallback
    refetchOnWindowFocus: true,
  });

  const { data: topUsers, refetch: refetchTopUsers } = useQuery({
    queryKey: ["topup-plan-top-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_pending_users" as any, { p_limit: 5 });
      if (error) throw error;
      return (data || []) as TopUserRow[];
    },
    staleTime: 0,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  // Realtime: refetch when runs/orders change so pending qty decreases live
  useEffect(() => {
    const channel = supabase
      .channel("admin-topup-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "organic_run_schedule" }, () => {
        queryClient.invalidateQueries({ queryKey: ["topup-plan-breakdown"] });
        queryClient.invalidateQueries({ queryKey: ["topup-plan-pending"] });
        queryClient.invalidateQueries({ queryKey: ["topup-plan-top-users"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["topup-plan-breakdown"] });
        queryClient.invalidateQueries({ queryKey: ["topup-plan-pending"] });
        queryClient.invalidateQueries({ queryKey: ["topup-plan-top-users"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_accounts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["topup-plan-accounts"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Trigger live provider balance sync from upstream provider APIs
  useEffect(() => {
    let cancelled = false;
    const syncBalances = async () => {
      try {
        await supabase.functions.invoke("check-provider-balance", { body: {} });
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ["topup-plan-accounts"] });
        }
      } catch (e) {
        console.error("balance sync failed", e);
      }
    };
    syncBalances();
    const id = setInterval(syncBalances, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [queryClient]);

  // Group breakdown rows per provider
  const breakdownByProvider = useMemo(() => {
    const map = new Map<string, BreakdownRow[]>();
    (breakdown || []).forEach((r) => {
      const arr = map.get(r.provider_id) || [];
      arr.push(r);
      map.set(r.provider_id, arr);
    });
    // sort each provider's services by pending qty desc
    map.forEach((arr) => arr.sort((a, b) => Number(b.pending_quantity) - Number(a.pending_quantity)));
    return map;
  }, [breakdown]);

  // Aggregate only TikTok Views and Instagram Views totals (views only)
  const viewsTotals = useMemo(() => {
    const buckets: Record<string, { label: string; pending_runs: number; pending_quantity: number; pending_user_usd: number }> = {
      tiktok: { label: "TikTok Views", pending_runs: 0, pending_quantity: 0, pending_user_usd: 0 },
      instagram: { label: "Instagram Views", pending_runs: 0, pending_quantity: 0, pending_user_usd: 0 },
    };
    (breakdown || []).forEach((r) => {
      const name = (r.service_name || "").toLowerCase();
      const cat = (r.service_category || "").toLowerCase();
      const isView = name.includes("view") || cat.includes("view");
      if (!isView) return;
      const isTiktok = name.includes("tiktok") || cat.includes("tiktok");
      const isInsta = name.includes("instagram") || cat.includes("instagram") || name.includes("reels");
      const bucket = isTiktok ? buckets.tiktok : isInsta ? buckets.instagram : null;
      if (!bucket) return;
      bucket.pending_runs += Number(r.pending_runs);
      bucket.pending_quantity += Number(r.pending_quantity);
      bucket.pending_user_usd += Number(r.pending_user_usd);
    });
    return [buckets.tiktok, buckets.instagram];
  }, [breakdown]);

  const plan = useMemo(() => {
    if (!pending || !accounts) return [];
    const accByProvider = new Map<string, AccountRow[]>();
    accounts.forEach((a) => {
      const arr = accByProvider.get(a.provider_id) || [];
      arr.push(a);
      accByProvider.set(a.provider_id, arr);
    });

    // Include pending providers
    const seen = new Set<string>();
    const rows = pending.map((p) => {
      seen.add(p.provider_id);
      const accs = accByProvider.get(p.provider_id) || [];
      // Balance in INR (convert USD-denominated accounts)
      const balanceInr = accs.reduce((sum, a) => {
        const bal = Number(a.balance || 0);
        const cur = (a.balance_currency || "").toUpperCase();
        return sum + (cur === "USD" ? bal * usdToInr : bal);
      }, 0);
      const markup = Number(p.markup_percent || 0);
      const providerCostUsd = Number(p.pending_user_usd) / (1 + markup / 100);
      const providerCostInr = providerCostUsd * usdToInr;
      const needed = providerCostInr * (1 + safetyPct / 100);
      const topup = Math.max(0, needed - balanceInr);
      return {
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        pending_runs: Number(p.pending_runs),
        user_usd: Number(p.pending_user_usd),
        provider_cost_inr: providerCostInr,
        balance_inr: balanceInr,
        topup_inr: topup,
        account_count: accs.length,
      };
    });

    // Idle providers with balance (no pending)
    accounts.forEach((a) => {
      if (seen.has(a.provider_id)) return;
      seen.add(a.provider_id);
      const accs = accByProvider.get(a.provider_id) || [];
      const balanceInr = accs.reduce((sum, x) => {
        const bal = Number(x.balance || 0);
        const cur = (x.balance_currency || "").toUpperCase();
        return sum + (cur === "USD" ? bal * usdToInr : bal);
      }, 0);
      rows.push({
        provider_id: a.provider_id,
        provider_name: a.name,
        pending_runs: 0,
        user_usd: 0,
        provider_cost_inr: 0,
        balance_inr: balanceInr,
        topup_inr: 0,
        account_count: accs.length,
      });
    });

    return rows.sort((a, b) => b.topup_inr - a.topup_inr);
  }, [pending, accounts, usdToInr, safetyPct]);

  const totalTopup = plan.reduce((s, r) => s + r.topup_inr, 0);
  const totalProviderCost = plan.reduce((s, r) => s + r.provider_cost_inr, 0);
  const totalBalance = plan.reduce((s, r) => s + r.balance_inr, 0);
  const totalRuns = plan.reduce((s, r) => s + r.pending_runs, 0);

  const copyPlan = () => {
    const lines = plan
      .filter((r) => r.topup_inr > 0)
      .map((r) => `${r.provider_name}: ₹${Math.ceil(r.topup_inr)}`)
      .join("\n");
    const text = lines + `\n\nTOTAL: ₹${Math.ceil(totalTopup)}`;
    navigator.clipboard.writeText(text);
    toast.success("Plan copied to clipboard");
  };

  const loading = pendingLoading || accLoading;

  const toggleExpand = (pid: string) => setExpanded((e) => ({ ...e, [pid]: !e[pid] }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Provider Top-up Plan</h1>
              <p className="text-sm text-muted-foreground">
                One-click "Add ₹X to each provider" based on current pending orders.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchPending(); refetchAcc(); refetchBreakdown(); refetchTopUsers(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={copyPlan} disabled={totalTopup <= 0}>
              <Copy className="h-4 w-4 mr-1" /> Copy Plan
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending Runs</p>
              <p className="text-2xl font-bold">{totalRuns.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Provider Cost (₹)</p>
              <p className="text-2xl font-bold">₹{Math.ceil(totalProviderCost).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Current Balance (₹)</p>
              <p className="text-2xl font-bold text-green-600">₹{Math.floor(totalBalance).toLocaleString()}</p>
            </CardContent>
          </Card>
          {(() => {
            const overall = totalBalance - totalProviderCost;
            const isExtra = overall >= 0;
            return (
              <Card className={isExtra ? "border-green-300" : "border-orange-300"}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{isExtra ? "Extra (₹)" : "Short (₹)"}</p>
                  <p className={`text-2xl font-bold ${isExtra ? "text-green-600" : "text-orange-600"}`}>
                    {isExtra ? "+" : "−"}₹{Math.floor(Math.abs(overall)).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Per-provider real-time balance vs need */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Per-Provider Balance vs Need
              <Badge variant="outline" className="ml-2 text-[10px] gap-1">
                <Radio className="h-3 w-3 text-green-500 animate-pulse" /> Live
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Har provider ka real-time balance, kitna lagne wala hai, aur kitna short ya extra hai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : plan.length === 0 ? (
              <p className="text-sm text-muted-foreground">No providers.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Need (₹)</TableHead>
                      <TableHead className="text-right">Balance (₹)</TableHead>
                      <TableHead className="text-right">Short / Extra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.map((r) => {
                      const diff = r.balance_inr - r.provider_cost_inr;
                      return (
                        <TableRow key={r.provider_id}>
                          <TableCell className="font-medium">{r.provider_name}</TableCell>
                          <TableCell className="text-right tabular-nums">₹{Math.ceil(r.provider_cost_inr).toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums">₹{Math.floor(r.balance_inr).toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">
                            {diff >= 0 ? (
                              <span className="text-green-600">+₹{Math.floor(diff).toLocaleString()} extra</span>
                            ) : (
                              <span className="text-orange-600">−₹{Math.ceil(-diff).toLocaleString()} short</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service-wise pending totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Service-wise Pending Totals
              <Badge variant="outline" className="ml-2 text-[10px] gap-1">
                <Radio className="h-3 w-3 text-green-500 animate-pulse" /> Live
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Total pending quantity per service (TikTok Views, Instagram Views, etc.) across all providers. Updates live as orders are sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(pendingError || accError) && (
              <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                <div className="font-semibold mb-1">Error loading data:</div>
                {pendingError && <div>Pending RPC: {(pendingError as any)?.message || String(pendingError)}</div>}
                {accError && <div>Accounts: {(accError as any)?.message || String(accError)}</div>}
              </div>
            )}
            {!loading && !pendingError && !accError && pending && accounts && (
              <div className="mb-3 text-[11px] text-muted-foreground">
                Loaded {pending.length} pending provider group(s), {accounts.length} account(s) from DB.
              </div>
            )}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {viewsTotals.map((b) => (
                  <div key={b.label} className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">{b.label}</p>
                    <p className="text-3xl font-bold text-orange-600 tabular-nums mt-1">
                      {b.pending_quantity.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {b.pending_runs.toLocaleString()} pending runs · ${b.pending_user_usd.toFixed(2)} user value
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 users by pending order value — fraud watch */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" /> Top 5 Users — Pending Order Value
              <Badge variant="outline" className="ml-2 text-[10px] gap-1">
                <Radio className="h-3 w-3 text-green-500 animate-pulse" /> Live
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Users with the highest current pending order value. Watch for fraud: low deposit + high pending value = suspicious.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!topUsers || topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending orders.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Pending Orders</TableHead>
                      <TableHead className="text-right">Pending Value ($)</TableHead>
                      <TableHead className="text-right">Wallet ($)</TableHead>
                      <TableHead className="text-right">Deposited ($)</TableHead>
                      <TableHead className="text-right">Spent ($)</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsers.map((u, i) => {
                      const deposited = Number(u.total_deposited);
                      const pending = Number(u.pending_value_usd);
                      const ratio = deposited > 0 ? pending / deposited : pending > 0 ? 999 : 0;
                      const risk = ratio >= 2
                        ? { label: "High", color: "destructive" as const }
                        : ratio >= 1
                          ? { label: "Watch", color: "default" as const }
                          : { label: "OK", color: "secondary" as const };
                      return (
                        <TableRow key={u.user_id}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium text-xs">{u.email}</div>
                            {u.full_name && <div className="text-[10px] text-muted-foreground">{u.full_name}</div>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{Number(u.pending_orders).toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold text-orange-600">
                            ${pending.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">${Number(u.wallet_balance).toFixed(2)}</TableCell>
                          <TableCell className="text-right tabular-nums">${deposited.toFixed(2)}</TableCell>
                          <TableCell className="text-right tabular-nums">${Number(u.total_spent).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={risk.color} className="text-[10px]">{risk.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Formula: <code>provider_cost = pending_user_value ÷ (1 + markup%)</code>, converted to INR at the rate above,
          then a safety buffer is added before subtracting the current provider balance.
        </p>
      </div>
    </DashboardLayout>
  );
}
