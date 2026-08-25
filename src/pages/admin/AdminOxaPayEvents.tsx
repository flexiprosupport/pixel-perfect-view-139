import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bitcoin, Search, Loader2, ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

type OxaEvent = {
  id: string;
  event_hash: string;
  order_id: string | null;
  track_id: string | null;
  status: string | null;
  signature_valid: boolean;
  processed: boolean;
  source_ip: string | null;
  payload: any;
  credit_result: any;
  notes: string | null;
  received_at: string;
};

type OxaDeposit = {
  id: string;
  order_id: string;
  track_id: string | null;
  user_id: string;
  amount_usd: number;
  amount_inr: number;
  pay_currency: string | null;
  status: string;
  credited: boolean;
  created_at: string;
};

export default function AdminOxaPayEvents() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'deposits' | 'events'>('deposits');

  const { data: events, isLoading: loadingE, refetch: refetchE, isFetching: fetchingE } = useQuery({
    queryKey: ['admin-oxapay-webhook-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oxapay_webhook_events' as any)
        .select('*')
        .order('received_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as OxaEvent[];
    },
  });

  const { data: deposits, isLoading: loadingD, refetch: refetchD, isFetching: fetchingD } = useQuery({
    queryKey: ['admin-oxapay-deposits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oxapay_deposits' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as OxaDeposit[];
    },
  });

  const filteredEvents = (events || []).filter((e) =>
    !search || [e.order_id, e.track_id, e.status, e.notes].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredDeposits = (deposits || []).filter((d) =>
    !search || [d.order_id, d.track_id, d.status, d.pay_currency].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const statusBadge = (s: string, credited?: boolean) => {
    const low = (s || '').toLowerCase();
    if (credited || ['paid','completed','confirmed','success'].includes(low))
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">{s || 'paid'}</Badge>;
    if (['expired','failed','cancelled','canceled','error'].includes(low))
      return <Badge className="bg-red-100 text-red-700 border-red-200">{s}</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{s || 'waiting'}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bitcoin className="h-6 w-6 text-amber-600" /> OxaPay Crypto Audit
            </h1>
            <p className="text-sm text-muted-foreground">Deposits & signed webhook events</p>
          </div>
          <button
            onClick={() => { refetchE(); refetchD(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${(fetchingE||fetchingD) ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('deposits')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab==='deposits' ? 'bg-amber-600 text-white' : 'bg-white border'}`}
          >Deposits ({deposits?.length || 0})</button>
          <button
            onClick={() => setTab('events')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab==='events' ? 'bg-amber-600 text-white' : 'bg-white border'}`}
          >Webhook Events ({events?.length || 0})</button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search order id, track id, status…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {tab === 'deposits' ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Deposits</CardTitle></CardHeader>
            <CardContent>
              {loadingD ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="py-2 pr-3">Created</th>
                        <th className="py-2 pr-3">Order ID</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 pr-3">Currency</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Credited</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeposits.map((d) => (
                        <tr key={d.id} className="border-b last:border-0">
                          <td className="py-2 pr-3">{format(new Date(d.created_at), 'MMM dd HH:mm')}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{d.order_id}</td>
                          <td className="py-2 pr-3">${d.amount_usd} / ₹{d.amount_inr}</td>
                          <td className="py-2 pr-3">{d.pay_currency || '—'}</td>
                          <td className="py-2 pr-3">{statusBadge(d.status, d.credited)}</td>
                          <td className="py-2 pr-3">{d.credited ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}</td>
                        </tr>
                      ))}
                      {!filteredDeposits.length && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No deposits</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Webhook Events</CardTitle></CardHeader>
            <CardContent>
              {loadingE ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2 pr-3">Order ID</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Signature</th>
                        <th className="py-2 pr-3">Processed</th>
                        <th className="py-2 pr-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((e) => (
                        <tr key={e.id} className="border-b last:border-0">
                          <td className="py-2 pr-3">{format(new Date(e.received_at), 'MMM dd HH:mm:ss')}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{e.order_id || '—'}</td>
                          <td className="py-2 pr-3">{statusBadge(e.status || '')}</td>
                          <td className="py-2 pr-3">
                            {e.signature_valid
                              ? <Badge className="bg-blue-100 text-blue-700 border-blue-200"><ShieldCheck className="h-3 w-3 mr-1" />valid</Badge>
                              : <Badge className="bg-red-100 text-red-700 border-red-200"><ShieldAlert className="h-3 w-3 mr-1" />invalid</Badge>}
                          </td>
                          <td className="py-2 pr-3">{e.processed ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground max-w-xs truncate">{e.notes || '—'}</td>
                        </tr>
                      ))}
                      {!filteredEvents.length && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No events</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}