import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { zapupiWebhookHealth } from '@/lib/zapupi.functions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, Activity, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type HealthResult = {
  ok: boolean;
  healthy?: boolean;
  canonical_webhook_url: string;
  instructions?: string;
  stats?: {
    webhooks_last_1h: number;
    webhooks_last_24h: number;
    last_received_at: string | null;
    last_received_minutes_ago?: number | null;
  };
  configured?: boolean;
  recent?: Array<{
    received_at: string;
    order_id: string;
    status: string | null;
    source: string | null;
    source_ip: string | null;
    processed: boolean | null;
    amount_match: boolean | null;
  }>;
  errors?: Array<{ order_id: string; at: string; message: string }>;
  server_time?: string;
  error?: string;
};

export function ZapUpiWebhookHealthCard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HealthResult | null>(null);
  const fetchHealth = useServerFn(zapupiWebhookHealth);
  const canonicalUrl =
    data?.canonical_webhook_url ??
    (typeof window !== 'undefined' ? `${window.location.origin}/api/public/zapupi-webhook` : '');

  const runCheck = async () => {
    setLoading(true);
    try {
      const json = (await fetchHealth({})) as HealthResult;
      setData(json);
      if (!json.ok) {
        toast({ title: 'Health check failed', description: json.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Cannot reach webhook', description: String((e as Error).message), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(canonicalUrl);
    toast({ title: 'Copied', description: 'Webhook URL copied to clipboard' });
  };

  const healthy = data?.healthy;
  const stats = data?.stats;

  return (
    <Card className="glass-card">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-base">ZapUPI Webhook Health</h3>
              <p className="text-xs text-muted-foreground">Verify ZapUPI dashboard is pointed at the live endpoint.</p>
            </div>
          </div>
          <Button size="sm" onClick={runCheck} disabled={loading} className="rounded-lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run check
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Canonical webhook URL (paste this in ZapUPI dashboard)</p>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs sm:text-sm bg-background px-2 py-1 rounded break-all flex-1 min-w-0">{canonicalUrl}</code>
            <Button size="sm" variant="outline" onClick={copyUrl} className="rounded-lg">
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
            </Button>
          </div>
        </div>

        {data && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {healthy ? (
                <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Receiving webhooks
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> No webhooks in last 24h
                </Badge>
              )}
              {stats?.last_received_at && (
                <span className="text-xs text-muted-foreground">
                  Last: {formatDistanceToNow(new Date(stats.last_received_at), { addSuffix: true })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Last 1h" value={stats?.webhooks_last_1h ?? 0} />
              <Stat label="Last 24h" value={stats?.webhooks_last_24h ?? 0} />
              <Stat label="API key" value={data.configured ? 'Set' : 'Missing'} tone={data.configured ? 'good' : 'bad'} />
              <Stat label="Status" value={healthy ? 'Healthy' : 'Idle'} tone={healthy ? 'good' : 'warn'} />
            </div>

            {!healthy && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                Endpoint is reachable but no webhooks arrived in 24h. Check ZapUPI dashboard → Webhook URL matches the canonical URL above exactly (HTTPS, no trailing slash, method POST).
              </div>
            )}

            {data.errors && data.errors.length > 0 && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs space-y-1">
                <p className="font-semibold text-red-600">Recent errors</p>
                {data.errors.map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <code className="truncate">{e.order_id}</code>
                    <span className="text-red-600 truncate">{e.message}</span>
                    <span className="text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}

            {data.recent && data.recent.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Recent webhook receipts</summary>
                <div className="mt-2 space-y-1">
                  {data.recent.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1">
                      <code className="truncate">{r.order_id}</code>
                      <span className="text-muted-foreground">{r.status ?? '—'}</span>
                      <span className="text-muted-foreground">{r.source ?? '—'}</span>
                      <span className="text-muted-foreground">{new Date(r.received_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'bad' | 'warn' }) {
  const color =
    tone === 'good' ? 'text-blue-600' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-foreground';
  return (
    <div className="rounded-lg border bg-background/50 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}