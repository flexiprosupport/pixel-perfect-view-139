import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';




const INR_PER_USD = 90;
const MAX_INR_PER_ACTION = 100000;

const walletActionSchema = z.object({
  target_user_id: z.string().uuid(),
  action: z.enum(['add', 'subtract']),
  inr_amount: z
    .number({ invalid_type_error: 'Enter a valid INR amount' })
    .positive('Amount must be greater than zero')
    .max(MAX_INR_PER_ACTION, `Maximum ₹${MAX_INR_PER_ACTION} per action`),
  reason: z
    .string()
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(300, 'Reason is too long'),
});

async function assertAdmin(context: { userId: unknown; supabase: any }) {
  const callerId = context.userId as string;
  const { data: roleRow } = await context.supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId)
    .eq('role', 'admin')
    .maybeSingle();
  if (!roleRow) throw new Error('Admins only');
  return callerId;
}

/** Admin wallet adjustment. Every change requires a stored reason. */
export const adminWalletAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => walletActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const callerId = await assertAdmin(context as any);
    const { performWalletAdjustment } = await import('@/lib/admin-wallet.server');
    return await performWalletAdjustment({
      callerId,
      targetUserId: data.target_user_id,
      action: data.action,
      inrAmount: data.inr_amount,
      reason: data.reason,
    });
  });

const selfTestSchema = z.object({
  inr_amount: z.number().positive().max(1000).optional(),
});

/** Live add/subtract self-test on the calling admin's own wallet. */
export const adminWalletSelfTest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => selfTestSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const callerId = await assertAdmin(context as any);
    const amount = data.inr_amount ?? 10;
    const { performWalletAdjustment } = await import('@/lib/admin-wallet.server');

    const steps: {
      step: string;
      expected_balance_inr: number;
      actual_balance_inr: number;
      audit_id: string | null;
      passed: boolean;
      error?: string;
    }[] = [];

    try {
      const add = await performWalletAdjustment({
        callerId,
        targetUserId: callerId,
        action: 'add',
        inrAmount: amount,
        reason: `Automated self-test: add ₹${amount}`,
      });
      const expectedAdd = Math.round((add.previous_balance * INR_PER_USD + amount) * 100) / 100;
      const actualAdd = Math.round(add.new_balance * INR_PER_USD * 100) / 100;
      steps.push({
        step: `Add ₹${amount}`,
        expected_balance_inr: expectedAdd,
        actual_balance_inr: actualAdd,
        audit_id: add.audit_id,
        passed: Math.abs(expectedAdd - actualAdd) < 0.05,
      });

      const sub = await performWalletAdjustment({
        callerId,
        targetUserId: callerId,
        action: 'subtract',
        inrAmount: amount,
        reason: `Automated self-test: subtract ₹${amount}`,
      });
      const expectedSub = Math.round((sub.previous_balance * INR_PER_USD - amount) * 100) / 100;
      const actualSub = Math.round(sub.new_balance * INR_PER_USD * 100) / 100;
      steps.push({
        step: `Subtract ₹${amount}`,
        expected_balance_inr: expectedSub,
        actual_balance_inr: actualSub,
        audit_id: sub.audit_id,
        passed: Math.abs(expectedSub - actualSub) < 0.05,
      });
    } catch (e) {
      steps.push({
        step: 'Self-test aborted',
        expected_balance_inr: 0,
        actual_balance_inr: 0,
        audit_id: null,
        passed: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return {
      ran_at: new Date().toISOString(),
      amount_inr: amount,
      passed: steps.every((s) => s.passed),
      steps,
    };
  });


const pendingDepositSchema = z.object({
  transaction_id: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
});

/** Admin approves/rejects a pending manual deposit transaction. */
export const adminPendingDepositAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => pendingDepositSchema.parse(input))
  .handler(async ({ data, context }) => {
    const callerId = context.userId as string;
    const { data: roleRow } = await context.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) throw new Error('Admins only');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: tx } = await supabaseAdmin
      .from('transactions')
      .select('id, user_id, amount, status, type')
      .eq('id', data.transaction_id)
      .maybeSingle();
    if (!tx) throw new Error('Transaction not found');
    if (tx.status !== 'pending') throw new Error('Transaction is not pending');
    if (tx.type !== 'deposit') throw new Error('Only deposit transactions can be approved');

    if (data.decision === 'reject') {
      const { error } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', tx.id);
      if (error) throw new Error(error.message);
      return { success: true, rejected: true };
    }

    const amount = Number(tx.amount ?? 0);
    if (!(amount > 0)) throw new Error('Invalid deposit amount');

    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance, total_deposited')
      .eq('user_id', tx.user_id)
      .maybeSingle();
    if (!wallet) throw new Error('Wallet not found for target user');

    const newBalance = Math.round((Number(wallet.balance ?? 0) + amount) * 10000) / 10000;

    // Mark the existing transaction completed FIRST (credit trail trigger), then credit.
    const { error: txErr } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'completed', balance_after: newBalance })
      .eq('id', tx.id);
    if (txErr) throw new Error(txErr.message);

    const { error: wErr } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: newBalance,
        total_deposited: Math.round((Number(wallet.total_deposited ?? 0) + amount) * 10000) / 10000,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', tx.user_id);
    if (wErr) throw new Error(wErr.message);

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('user_id', callerId)
      .maybeSingle();
    await supabaseAdmin.from('admin_audit_log').insert({
      actor_id: callerId,
      actor_email: callerProfile?.email ?? null,
      target_user_id: tx.user_id,
      action: 'deposit_approved',
      metadata: { transaction_id: tx.id, amount },
    });

    return { success: true, approved: true, new_balance: newBalance };
  });
