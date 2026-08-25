import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Bitcoin, ShieldCheck } from 'lucide-react';

const USD_TO_INR = 90;
const QUICK_INR = [90, 500, 1000, 2000, 5000, 10000];

type InvoiceResponse = {
  error?: string;
  detail?: unknown;
  payment_url?: string;
};

export default function OxaPayAddFunds() {
  const [inr, setInr] = useState<string>('90');
  const [loading, setLoading] = useState(false);

  const amountInr = Number(inr || 0);

  const createInvoice = async () => {
    const inrNum = Math.round(Number(inr) * 100) / 100;
    if (!Number.isFinite(inrNum) || inrNum < 90) return toast.error('Minimum ₹90');
    if (inrNum > 540000) return toast.error('Maximum ₹5,40,000 per transaction');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('oxapay-create-invoice', {
        body: { amount_inr: inrNum, return_origin: window.location.origin },
      });
      const res = data as InvoiceResponse | null;
      if (res?.error) throw new Error(res.error + (res?.detail ? `: ${JSON.stringify(res.detail)}` : ''));
      if (error) throw new Error(error.message);
      if (!res?.payment_url) throw new Error('Payment page not found');
      window.location.href = res.payment_url;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create invoice');
      setLoading(false);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-7"
      style={{
        background: 'white',
        border: '1px solid #eef1f6',
        boxShadow: '0 4px 24px -8px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.04)',
        fontFamily: 'Manrope, system-ui, sans-serif',
      }}
    >
      <div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(245,158,11,.10), transparent 70%)' }}
      />

      <div className="relative flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 6px 16px -6px rgba(217,119,6,.5)' }}
          >
            <Bitcoin className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[17px] font-bold tracking-tight" style={{ color: '#0f172a', fontFamily: 'Sora, system-ui, sans-serif' }}>
              Crypto Add Funds
            </h2>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mt-0.5" style={{ color: '#d97706' }}>
              OxaPay · USDT · BTC · TRX · LTC · ETH
            </p>
          </div>
        </div>
        <div
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: 'rgba(37,99,235,.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,.18)' }}
        >
          <ShieldCheck className="h-3 w-3" /> AUTO-CREDIT
        </div>
      </div>

      <p className="text-[13px] leading-relaxed mb-6" style={{ color: '#64748b' }}>
        Enter INR amount. The payment page will open with the matching crypto amount automatically.
      </p>

      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
        Amount (INR)
      </label>
      <div className="relative mt-2">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-lg font-bold"
          style={{ background: 'rgba(217,119,6,.08)', color: '#d97706' }}>
          ₹
        </div>
        <input
          type="number"
          min={90} max={540000} step="1"
          value={inr}
          onChange={(e) => setInr(e.target.value)}
          placeholder="500"
          className="w-full pl-14 pr-4 h-14 text-2xl font-bold border-2 rounded-xl outline-none"
          style={{ color: '#0f172a', borderColor: '#e2e8f0', background: '#f8fafc', fontFamily: 'Sora, system-ui, sans-serif' }}
        />
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: '#94a3b8' }}>
        ₹{Number.isFinite(amountInr) ? amountInr.toLocaleString('en-IN') : '0'} will be credited after confirmation · Min ₹90
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
        {QUICK_INR.map((v) => {
          const active = inr === String(v);
          return (
            <button key={v} type="button" onClick={() => setInr(String(v))}
              className="py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
              style={{
                background: active ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'white',
                color: active ? 'white' : '#475569',
                border: active ? '1px solid transparent' : '1.5px solid #e2e8f0',
                boxShadow: active ? '0 4px 12px -4px rgba(217,119,6,.45)' : 'none',
              }}>
              ₹{v >= 1000 ? `${v / 1000}k` : v}
            </button>
          );
        })}
      </div>

      <button
        onClick={createInvoice}
        disabled={loading || !inr}
        className="w-full mt-6 h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[.98] disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
          color: 'white',
          boxShadow: '0 10px 24px -8px rgba(217,119,6,.55)',
          fontFamily: 'Sora, system-ui, sans-serif',
        }}
      >
        {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Opening payment page…</>
          : <><Bitcoin className="h-5 w-5" /> Pay ₹{Number.isFinite(amountInr) && amountInr > 0 ? amountInr.toLocaleString('en-IN') : ''} Now</>}
      </button>
    </div>
  );
}