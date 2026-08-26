import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions, type TransactionFilter } from '@/hooks/useTransactions';
import { useCurrency } from '@/hooks/useCurrency';
import ZapUpiDepositCard from '@/components/wallet/ZapUpiDepositCard';
import { supabase } from '@/integrations/supabase/client';
import { useServerFn } from '@tanstack/react-start';
import { syncZapupiDeposit } from '@/lib/zapupi.functions';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
  IndianRupee,
  Zap,
} from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';

export default function Wallet() {
  const { wallet } = useWallet();
  const { formatPrice, rates } = useCurrency();
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const { data: transactions } = useTransactions(filter);
  const qc = useQueryClient();
  const [depositMethod, setDepositMethod] = useState<'upi' | 'crypto'>('upi');
  const syncDeposit = useServerFn(syncZapupiDeposit);

  // Handle ZapUPI return — poll server-verify until the order is credited (or give up after ~3 min).
  useEffect(() => {
    const url = new URL(window.location.href);
    const rawOrderId = url.searchParams.get('zapupi_order_id') || url.searchParams.get('deposit_order_id') || url.searchParams.get('order_id');
    // Skip OxaPay-prefixed orders (handled by the separate OxaPay effect below)
    const orderId = rawOrderId && !rawOrderId.startsWith('OXP_') ? rawOrderId : null;
    const status = (url.searchParams.get('status') || '').toLowerCase();
    if (!orderId) return;

    const cleanUrl = () => {
      url.searchParams.delete('order_id');
      url.searchParams.delete('zapupi_order_id');
      url.searchParams.delete('deposit_order_id');
      url.searchParams.delete('gateway_order_id');
      url.searchParams.delete('txn_id');
      url.searchParams.delete('utr');
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams}` : ''));
    };

    const claimedKey = `zapupi_claimed_${orderId}`;
    const inflightKey = `zapupi_inflight_${orderId}`;

    // Already credited in a previous visit/tab → instant message, no re-claim.
    if (sessionStorage.getItem(claimedKey) === 'done' || localStorage.getItem(claimedKey) === 'done') {
      toast.success('This payment is already credited to your wallet.');
      cleanUrl();
      return;
    }

    // Another tab/poll is already verifying the same order → don't duplicate.
    const inflightAt = Number(sessionStorage.getItem(inflightKey) || '0');
    if (inflightAt && Date.now() - inflightAt < 60_000) {
      toast.info('Payment is already being verified…');
      return;
    }
    sessionStorage.setItem(inflightKey, String(Date.now()));

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 36; // ~3 minutes at 5s
    const pendingToast = toast.loading('Verifying payment…');

    if (status === 'failed' || status === 'timeout' || status === 'cancelled' || status === 'cancel') {
      toast.error(status === 'timeout' ? 'Payment timed out' : 'Payment cancelled or failed', { id: pendingToast });
      sessionStorage.removeItem(inflightKey);
      cleanUrl();
      return;
    }

    const poll = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const res = (await syncDeposit({ data: { order_id: orderId } })) as any;
        if (res?.error && !res?.credited) throw new Error(res.error);
        const credited = res?.credited;
        const already = res?.already || res?.result?.duplicate;
        if (credited || already) {
          localStorage.setItem(claimedKey, 'done');
          sessionStorage.setItem(claimedKey, 'done');
          sessionStorage.removeItem(inflightKey);
          toast.success(
            already ? 'Already credited to your wallet.' : 'Payment successful — wallet credited',
            { id: pendingToast },
          );
          qc.invalidateQueries({ queryKey: ['wallet'] });
          qc.invalidateQueries({ queryKey: ['transactions'] });
          cleanUrl();
          return;
        }
      } catch {
        // ignore and retry
      }
      if (attempts >= maxAttempts) {
        if (status === 'failed') {
          toast.error('Payment failed or cancelled', { id: pendingToast });
        } else {
          toast.info('Payment not confirmed yet. If you paid, balance will update shortly.', { id: pendingToast });
        }
        sessionStorage.removeItem(inflightKey);
        qc.invalidateQueries({ queryKey: ['wallet'] });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        cleanUrl();
        return;
      }
      setTimeout(poll, 3000);
    };

    poll();
    return () => {
      cancelled = true;
      sessionStorage.removeItem(inflightKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle OxaPay return — poll oxapay-sync-deposit; webhook does the actual crediting.
  useEffect(() => {
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get('oxapay_order_id');
    const status = (url.searchParams.get('status') || url.searchParams.get('oxapay') || '').toLowerCase();
    if (!orderId || !orderId.startsWith('OXP_')) return;

    const cleanUrl = () => {
      url.searchParams.delete('oxapay_order_id');
      url.searchParams.delete('oxapay');
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams}` : ''));
    };

    const claimedKey = `oxapay_claimed_${orderId}`;
    const inflightKey = `oxapay_inflight_${orderId}`;
    if (sessionStorage.getItem(claimedKey) === 'done' || localStorage.getItem(claimedKey) === 'done') {
      toast.success('This crypto payment is already credited.');
      cleanUrl();
      return;
    }
    const inflightAt = Number(sessionStorage.getItem(inflightKey) || '0');
    if (inflightAt && Date.now() - inflightAt < 60_000) return;
    sessionStorage.setItem(inflightKey, String(Date.now()));

    if (status === 'failed' || status === 'cancelled' || status === 'cancel' || status === 'expired') {
      toast.error('Crypto payment cancelled or failed');
      sessionStorage.removeItem(inflightKey);
      cleanUrl();
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // ~2 min at 6s
    const pendingToast = toast.loading('Verifying crypto payment…');

    const poll = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const { data, error } = await supabase.functions.invoke('oxapay-sync-deposit', {
          body: { order_id: orderId },
        });
        if (error) throw new Error(error.message);
        const res = data as any;
        if (res?.credited || res?.already) {
          localStorage.setItem(claimedKey, 'done');
          sessionStorage.setItem(claimedKey, 'done');
          sessionStorage.removeItem(inflightKey);
          toast.success(res?.already ? 'Already credited.' : 'Crypto payment credited to wallet', { id: pendingToast });
          qc.invalidateQueries({ queryKey: ['wallet'] });
          qc.invalidateQueries({ queryKey: ['transactions'] });
          cleanUrl();
          return;
        }
      } catch {
        // ignore and retry
      }
      if (attempts >= maxAttempts) {
        toast.info('Payment not confirmed yet. Wallet will update once network confirms.', { id: pendingToast });
        sessionStorage.removeItem(inflightKey);
        qc.invalidateQueries({ queryKey: ['wallet'] });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        cleanUrl();
        return;
      }
      setTimeout(poll, 6000);
    };
    poll();
    return () => {
      cancelled = true;
      sessionStorage.removeItem(inflightKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="h-4 w-4" style={{ color: '#2563EB' }} />;
      case 'order': return <ArrowUpRight className="h-4 w-4" style={{ color: '#ef4444' }} />;
      case 'refund': return <RefreshCw className="h-4 w-4" style={{ color: '#10b981' }} />;
      default: return <WalletIcon className="h-4 w-4" style={{ color: '#999' }} />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'deposit': return 'rgba(37,99,235,.1)';
      case 'order': return 'rgba(239,68,68,.1)';
      case 'refund': return 'rgba(22, 163, 74,.1)';
      default: return 'rgba(0,0,0,.04)';
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'deposit': return '#2563EB';
      case 'order': return '#ef4444';
      case 'refund': return '#10b981';
      default: return '#1a1a2e';
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const displayTransactions = (() => {
    if (!transactions?.length) return [];

    const adjustments = new Map<string, number>();
    const inrRate = rates.INR || 90;

    for (const tx of transactions) {
      if (tx.payment_method !== 'razorpay_auto' || !tx.payment_reference) continue;

      const originalReference = tx.payment_reference.endsWith('_exact_credit_fix')
        ? tx.payment_reference.replace(/_exact_credit_fix$/, '')
        : tx.payment_reference.endsWith('_fee_adjust')
          ? tx.payment_reference.replace(/_fee_adjust$/, '')
          : null;

      if (!originalReference) continue;
      adjustments.set(originalReference, (adjustments.get(originalReference) || 0) + Number(tx.amount || 0));
    }

    return transactions
      .filter((tx) => !(tx.payment_method === 'razorpay_auto' && tx.payment_reference && (tx.payment_reference.endsWith('_exact_credit_fix') || tx.payment_reference.endsWith('_fee_adjust'))))
      .map((tx) => {
        const adjustment = tx.payment_method === 'razorpay_auto' && tx.payment_reference
          ? adjustments.get(tx.payment_reference) || 0
          : 0;

        const displayAmount = Number(tx.amount || 0) + adjustment;
        const displayBalanceAfter = tx.balance_after != null
          ? Number(tx.balance_after) + adjustment
          : null;

        const displayDescription = tx.payment_method === 'razorpay_auto' && adjustment !== 0
          ? `Wallet top-up via Razorpay (₹${(displayAmount * inrRate).toFixed(2)} exact credit)`
          : (tx.description || tx.type.charAt(0).toUpperCase() + tx.type.slice(1));

        return {
          ...tx,
          displayAmount,
          displayBalanceAfter,
          displayDescription,
        };
      });
  })();

  return (
    <DashboardLayout>
      <PageMeta title="Wallet & Top-up" description="Add funds via UPI or crypto and review your FlexiPro wallet balance and transaction history." canonicalPath="/wallet" noIndex />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>Wallet</h1>
          <p className="text-[13px] mt-1" style={{ color: '#999' }}>Manage your balance and transactions.</p>
        </div>

        {/* Balance Card — Compact Emerald */}
        <div
          className="relative overflow-hidden rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #2563EB 55%, #60A5FA 100%)',
            boxShadow: '0 10px 28px -12px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.18)',
            fontFamily: "'Manrope', system-ui, sans-serif",
          }}
        >
          {/* decorative orbs */}
          <div
            aria-hidden
            className="absolute -top-16 -right-12 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,.22), transparent 70%)' }}
          />
          <div
            aria-hidden
            className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(closest-side, rgba(244,114,182,.45), transparent 70%)' }}
          />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(4px)' }}
              >
                <WalletIcon className="h-3.5 w-3.5 text-white" />
              </span>
              <p
                className="text-[10px] font-semibold uppercase text-white/80"
                style={{ letterSpacing: '0.16em' }}
              >
                Available Balance
              </p>
            </div>
            <div
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: 'rgba(255,255,255,.18)', letterSpacing: '0.05em' }}
            >
              INR
            </div>
          </div>

          <p
            className="relative z-10 mt-2 text-3xl md:text-4xl text-white"
            style={{
              fontFamily: "'Manrope', system-ui, sans-serif",
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            {formatPrice(wallet?.balance || 0)}
          </p>

          {/* stats row */}
          <div
            className="relative z-10 mt-3 pt-3 grid grid-cols-2 gap-3"
            style={{ borderTop: '1px solid rgba(255,255,255,.18)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
                style={{ background: 'rgba(255,255,255,.18)' }}
              >
                <ArrowDownLeft className="h-3.5 w-3.5 text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase text-white/70" style={{ letterSpacing: '0.14em' }}>
                  Total In
                </p>
                <p
                  className="text-[13px] text-white truncate"
                  style={{ fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 600 }}
                >
                  {formatPrice(wallet?.total_deposited || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
                style={{ background: 'rgba(255,255,255,.18)' }}
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase text-white/70" style={{ letterSpacing: '0.14em' }}>
                  Total Out
                </p>
                <p
                  className="text-[13px] text-white truncate"
                  style={{ fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 600 }}
                >
                  {formatPrice(wallet?.total_spent || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Deposit Section — UPI + Crypto tabs */}
        <div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setDepositMethod('upi')}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
              style={{
                background: depositMethod === 'upi' ? 'linear-gradient(135deg, #ff8a3d, #ea580c)' : 'white',
                color: depositMethod === 'upi' ? 'white' : '#475569',
                border: depositMethod === 'upi' ? '1px solid transparent' : '1.5px solid #e2e8f0',
                boxShadow: depositMethod === 'upi' ? '0 4px 12px -4px rgba(234,88,12,.4)' : 'none',
              }}
            >
              💳 UPI (INR)
            </button>
            <button
              onClick={() => setDepositMethod('crypto')}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
              style={{
                background: depositMethod === 'crypto' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'white',
                color: depositMethod === 'crypto' ? 'white' : '#475569',
                border: depositMethod === 'crypto' ? '1px solid transparent' : '1.5px solid #e2e8f0',
                boxShadow: depositMethod === 'crypto' ? '0 4px 12px -4px rgba(217,119,6,.4)' : 'none',
              }}
            >
              🪙 Crypto · Maintenance
            </button>
          </div>
          {depositMethod === 'upi' ? (
            <ZapUpiDepositCard />
          ) : (
            <div
              className="rounded-3xl p-8 text-center"
              style={{ background: 'white', border: '1px solid #eef1f6', boxShadow: '0 4px 24px -8px rgba(15,23,42,.08)' }}
            >
              <div
                className="mx-auto mb-4 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(217,119,6,.10)' }}
              >
                🛠️
              </div>
              <h3 className="text-[17px] font-bold mb-1" style={{ color: '#0f172a' }}>
                Crypto deposits are under maintenance
              </h3>
              <p className="text-[13px] mb-5" style={{ color: '#64748b' }}>
                We are upgrading our crypto gateway. Please use UPI (INR) — it is fully functional and credits instantly.
              </p>
              <button
                onClick={() => setDepositMethod('upi')}
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold"
                style={{ background: 'linear-gradient(135deg, #ff8a3d, #ea580c)', color: 'white' }}
              >
                Pay with UPI (INR)
              </button>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-lg font-bold" style={{ color: '#1a1a2e' }}>Transaction History</h2>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,.03)' }}>
              {(['all', 'deposit', 'order', 'refund'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: filter === f ? '#2563EB' : 'transparent',
                    color: filter === f ? 'white' : '#888',
                  }}
                >
                  {f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : f === 'order' ? 'Orders' : 'Refunds'}
                </button>
              ))}
            </div>
          </div>

          {displayTransactions.length > 0 ? (
            <div className="space-y-2">
              {displayTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-colors"
                  style={{ background: 'rgba(0,0,0,.015)', border: '1px solid rgba(0,0,0,.04)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: getIconBg(tx.type) }}>
                      {getIcon(tx.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[13px] leading-tight truncate max-w-[260px]" style={{ color: '#1a1a2e' }}>
                        {tx.displayDescription}
                      </p>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                        {tx.payment_method && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,.04)', color: '#888' }}>
                            {tx.payment_method.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        )}
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: tx.status === 'pending' ? 'rgba(245,158,11,.1)' : tx.status === 'completed' ? 'rgba(37,99,235,.1)' : 'rgba(239,68,68,.1)',
                            color: tx.status === 'pending' ? '#f59e0b' : tx.status === 'completed' ? '#2563EB' : '#ef4444',
                          }}
                        >
                          {tx.status}
                        </span>
                        <span className="text-[11px]" style={{ color: '#bbb' }}>{fmtDate(tx.created_at!)}</span>
                        {tx.payment_reference && tx.payment_method === 'usdt_bep20' && (
                          <a
                            href={`https://bscscan.com/tx/${tx.payment_reference}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] flex items-center gap-0.5 hover:underline"
                            style={{ color: '#2563EB' }}
                          >
                            BSCScan <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-[15px]" style={{ color: getAmountColor(tx.type) }}>
                      {tx.type === 'order' ? '−' : '+'}{formatPrice(Math.abs(Number(tx.displayAmount)))}
                    </p>
                    {tx.displayBalanceAfter != null && (
                      <p className="text-[11px] mt-0.5" style={{ color: '#bbb' }}>
                        Bal: {formatPrice(Number(tx.displayBalanceAfter))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(37,99,235,.08)' }}>
                <WalletIcon className="h-6 w-6" style={{ color: '#2563EB' }} />
              </div>
              <p className="font-medium text-[14px]" style={{ color: '#666' }}>No transactions yet</p>
              <p className="text-[12px] mt-1" style={{ color: '#bbb' }}>Your deposits and spending history will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
