import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2, Zap, IndianRupee, ShieldCheck, ArrowRight, ExternalLink, RefreshCw, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { createZapupiOrder, syncZapupiDeposit, listMyZapupiDeposits } from '@/lib/zapupi.functions';

const MIN_INR = 100;
const QUICK = [100, 500, 1000, 2000, 5000];

type Deposit = {
  order_id: string;
  amount_inr: number;
  status: string;
  credited: boolean;
  payment_url: string | null;
  created_at: string;
};

export default function ZapUpiDepositCard() {
  const [amount, setAmount] = useState<string>('500');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [recent, setRecent] = useState<Deposit[]>([]);

  const createOrder = useServerFn(createZapupiOrder);
  const syncDeposit = useServerFn(syncZapupiDeposit);
  const listDeposits = useServerFn(listMyZapupiDeposits);

  const refreshRecent = async () => {
    try {
      const res = await listDeposits({});
      setRecent(res.deposits ?? []);
    } catch {
      /* silent — status list is informational */
    }
  };

  useEffect(() => {
    void refreshRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPaymentPage = (payUrl: string) => {
    const isEmbedded = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    try {
      if (isEmbedded) {
        const opened = window.open(payUrl, '_blank');
        if (opened) {
          opened.opener = null;
          setLoading(false);
          toast.info('Payment opened in a secure tab. Complete it to return to wallet.');
          return;
        }
      }
      if (window.top && window.top !== window) {
        window.top.location.href = payUrl;
        return;
      }
    } catch {
      /* iframe top navigation blocked — fall through */
    }
    window.location.href = payUrl;
  };

  const handlePay = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < MIN_INR) return toast.error(`Minimum ₹${MIN_INR}`);
    if (amt > 100000) return toast.error('Maximum ₹1,00,000 per transaction');

    setLoading(true);
    try {
      const res = await createOrder({ data: { amount_inr: amt } });
      if (!res.ok || !('payment_url' in res) || !res.payment_url) {
        throw new Error(('error' in res && res.error) || 'Gateway did not return a payment link');
      }
      void refreshRecent();
      openPaymentPage(res.payment_url);
    } catch (e: any) {
      toast.error(e?.message || 'Could not start payment');
      setLoading(false);
    }
  };

  const handleCheck = async (orderId: string) => {
    setChecking(orderId);
    const id = toast.loading('Checking payment status…');
    try {
      const res: any = await syncDeposit({ data: { order_id: orderId } });
      if (res?.credited) {
        toast.success(res.already ? 'Already credited to your wallet.' : 'Payment confirmed — wallet credited', { id });
      } else if (res?.mismatch) {
        toast.error('Paid amount does not match the order. Contact support.', { id });
      } else {
        toast.info('Payment not confirmed yet. If you paid, try again in a moment.', { id });
      }
      await refreshRecent();
    } catch {
      toast.error('Could not check the payment right now.', { id });
    } finally {
      setChecking(null);
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
        style={{ background: 'radial-gradient(closest-side, rgba(234,88,12,.10), transparent 70%)' }}
      />

      <div className="relative flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #ff8a3d, #ea580c)', boxShadow: '0 6px 16px -6px rgba(234,88,12,.5)' }}
          >
            <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-[17px] font-bold tracking-tight" style={{ color: '#0f172a', fontFamily: 'Sora, system-ui, sans-serif' }}>
              Add Funds
            </h2>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mt-0.5" style={{ color: '#ea580c' }}>
              Instant UPI · Auto-credit
            </p>
          </div>
        </div>
        <div
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: 'rgba(37,99,235,.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,.18)' }}
        >
          <ShieldCheck className="h-3 w-3" /> SECURE
        </div>
      </div>

      <p className="text-[13px] leading-relaxed mb-6" style={{ color: '#64748b' }}>
        Pay via UPI · GPay · PhonePe · Paytm — your wallet is credited instantly after payment.
      </p>

      <Label htmlFor="zap-amount" className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
        Enter Amount
      </Label>
      <div className="relative mt-2">
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ background: 'rgba(234,88,12,.08)' }}
        >
          <IndianRupee className="h-3.5 w-3.5" style={{ color: '#ea580c' }} strokeWidth={2.5} />
        </div>
        <Input
          id="zap-amount"
          type="number"
          inputMode="decimal"
          min={MIN_INR}
          max={100000}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500"
          className="pl-14 pr-4 h-14 text-2xl font-bold border-2 rounded-xl"
          style={{
            color: '#0f172a',
            borderColor: '#e2e8f0',
            background: '#f8fafc',
            fontFamily: 'Sora, system-ui, sans-serif',
          }}
        />
      </div>

      <div className="grid grid-cols-5 gap-2 mt-3">
        {QUICK.map((v) => {
          const active = amount === String(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              className="py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
              style={{
                background: active ? 'linear-gradient(135deg, #ff8a3d, #ea580c)' : 'white',
                color: active ? 'white' : '#475569',
                border: active ? '1px solid transparent' : '1.5px solid #e2e8f0',
                boxShadow: active ? '0 4px 12px -4px rgba(234,88,12,.45)' : 'none',
              }}
            >
              ₹{v >= 1000 ? `${v / 1000}k` : v}
            </button>
          );
        })}
      </div>

      <button
        onClick={handlePay}
        disabled={loading || !amount}
        className="w-full mt-6 h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #ff8a3d 0%, #ea580c 50%, #c2410c 100%)',
          color: 'white',
          boxShadow: '0 10px 24px -8px rgba(234,88,12,.55), inset 0 1px 0 rgba(255,255,255,.25)',
          fontFamily: 'Sora, system-ui, sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Redirecting to UPI…
          </>
        ) : (
          <>
            <Zap className="h-5 w-5" fill="white" strokeWidth={2.5} />
            Pay ₹{Number(amount || 0).toLocaleString('en-IN')} Now
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </>
        )}
      </button>

      {recent.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
              Recent payments
            </p>
            <button
              type="button"
              onClick={() => void refreshRecent()}
              className="text-[11px] font-semibold flex items-center gap-1"
              style={{ color: '#2563EB' }}
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {recent.map((d) => {
            const done = d.credited || d.status === 'completed';
            const failed = d.status === 'failed' || d.status === 'mismatch';
            return (
              <div
                key={d.order_id}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                style={{ border: '1px solid #eef1f6', background: '#f8fafc' }}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: '#0f172a' }}>
                    ₹{Number(d.amount_inr).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: '#94a3b8' }}>
                    {new Date(d.created_at).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                    style={{
                      background: done ? 'rgba(22,163,74,.10)' : failed ? 'rgba(220,38,38,.10)' : 'rgba(234,88,12,.10)',
                      color: done ? '#16a34a' : failed ? '#dc2626' : '#ea580c',
                    }}
                  >
                    {done ? <CheckCircle2 className="h-3 w-3" /> : failed ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {done ? 'Credited' : failed ? (d.status === 'mismatch' ? 'Mismatch' : 'Failed') : 'Pending'}
                  </span>

                  {!done && !failed && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleCheck(d.order_id)}
                        disabled={checking === d.order_id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold disabled:opacity-60"
                        style={{ background: '#2563EB', color: 'white' }}
                      >
                        {checking === d.order_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Check'}
                      </button>
                      {d.payment_url && (
                        <a
                          href={d.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
                          style={{ border: '1px solid #e2e8f0', color: '#475569' }}
                        >
                          <ExternalLink className="h-3 w-3" /> Pay
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 mt-4">
        <ShieldCheck className="h-3 w-3" style={{ color: '#94a3b8' }} />
        <p className="text-[11px]" style={{ color: '#94a3b8' }}>
          Auto-verified by server · No refresh needed
        </p>
      </div>
    </div>
  );
}
