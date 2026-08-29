import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

// Super-admin allowlist enforced SERVER-SIDE. The client-side list in
// AdminUsers.tsx is UI-only; this gate is the authoritative one.
const SUPER_ADMIN_USER_IDS = new Set([
  '581a69bb-fe78-4da6-98cd-f36fdeff8f28', // zyrofit.my@gmail.com
  '82f9bd93-1e39-47ef-bdc0-f579262a122a', // admin@gmail.com (legacy)
  'ff8f0b43-4d5a-4887-b589-77047a3bc9ff', // admin@gmail.com
  '93369079-e17a-4df6-a4a6-1c2a832231b2', // bjkagrahaoamqnvs@gmail.com
]);

const INR_PER_USD = 90;
const MAX_INR_PER_ACTION = 100000;

const walletActionSchema = z.object({
  target_user_id: z.string().uuid(),
  action: z.enum(['add', 'subtract']),
  inr_amount: z
    .number({ invalid_type_error: 'Enter a valid INR amount' })
    .positive('Amount must be greater than zero')
    .max(MAX_INR_PER_ACTION, `Maximum ₹${MAX_INR_PER_ACTION} per action`),
});

/** Admin wallet adjustment. Adds are restricted to super-admins on the server. */
export const adminWalletAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => walletActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const callerId = context.userId as string;
    const callerClient = context.supabase;

    // Must be an admin at all (checked server-side via RLS-backed role table).
    const { data: isAdmin } = await callerClient.rpc('has_role', {
      _user_id: callerId,
      _role: 'admin',
    });
    if (!isAdmin) throw new Error('Admins only');

    // THE FIX: super-admin gate enforced on the server, not in the browser.
    if (data.action === 'add' && !SUPER_ADMIN_USER_IDS.has(callerId)) {
      throw new Error('Only a super-admin can add funds');
    }

    const usdAmount = Math.round((data.inr_amount / INR_PER_USD) * 10000) / 10000;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance, total_spent')
      .eq('user_id', data.target_user_id)
      .maybeSingle();
    if (!wallet) throw new Error('Wallet not found for target user');

    const balance = Number(wallet.balance ?? 0);
    const spent = Number(wallet.total_spent ?? 0);
    let newBalance: number;
    if (data.action === 'add') {
      newBalance = Math.round((balance + usdAmount) * 10000) / 10000;
    } else {
      if (usdAmount > balance) throw new Error('Amount exceeds current balance');
      newBalance = Math.round((balance - usdAmount) * 10000) / 10000;
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('user_id', callerId)
      .maybeSingle();
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('user_id', data.target_user_id)
      .maybeSingle();

    // Audit trail FIRST (wallet credit trigger requires a matching transaction row).
    const { error: txErr } = await supabaseAdmin.from('transactions').insert({
      user_id: data.target_user_id,
      type: data.action === 'add' ? 'deposit' : 'admin_adjustment',
      amount: data.action === 'add' ? usdAmount : -usdAmount,
      balance_after: newBalance,
      status: 'completed',
      payment_method: data.action === 'add' ? 'manual_admin' : null,
      description: `Admin wallet ${data.action} of ₹${data.inr_amount} ($${usdAmount}) by ${callerProfile?.email ?? callerId}`,
    });
    if (txErr) throw new Error(`Transaction record failed: ${txErr.message}`);

    const { error: updErr } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: newBalance,
        total_spent:
          data.action === 'subtract'
            ? Math.max(0, Math.round((spent - usdAmount) * 10000) / 10000)
            : spent,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', data.target_user_id);
    if (updErr) throw new Error(`Wallet update failed: ${updErr.message}`);

    await supabaseAdmin.from('admin_audit_log').insert({
      actor_id: callerId,
      actor_email: callerProfile?.email ?? null,
      target_user_id: data.target_user_id,
      target_email: targetProfile?.email ?? null,
      action: data.action === 'add' ? 'wallet_credit' : 'wallet_debit',
      notes: `₹${data.inr_amount} ($${usdAmount})`,
      metadata: {
        inr_amount: data.inr_amount,
        usd_amount: usdAmount,
        new_balance: newBalance,
      },
    });

    return { success: true, new_balance: newBalance };
  });
