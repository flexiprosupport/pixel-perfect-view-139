import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Run the wallet ledger reconciliation now (admin only). */
export const runWalletReconciliationFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import('@/lib/providers.server');
    await assertAdmin(context.supabase, context.userId as string);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin.rpc('reconcile_wallets' as never);
    if (error) throw new Error(error.message);
    return data as unknown as {
      report_id: string;
      wallets_checked: number;
      mismatch_count: number;
      total_drift: number;
      mismatches: Record<string, number | string>[];
    };

  });

/** Latest reconciliation reports (admin only). */
export const listWalletReconciliationFn = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import('@/lib/providers.server');
    await assertAdmin(context.supabase, context.userId as string);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin
      .from('wallet_reconciliation_reports')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
