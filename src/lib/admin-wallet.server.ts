/** Server-only core logic for admin wallet adjustments. */

export const INR_PER_USD = 90;
export const MAX_INR_PER_ACTION = 100000;

export type WalletAdjustmentResult = {
  success: true;
  new_balance: number;
  audit_id: string | null;
  usd_amount: number;
  previous_balance: number;
};

export async function performWalletAdjustment(params: {
  callerId: string;
  targetUserId: string;
  action: 'add' | 'subtract';
  inrAmount: number;
  reason: string;
}): Promise<WalletAdjustmentResult> {
  const { callerId, targetUserId, action, inrAmount, reason } = params;
  const usdAmount = Math.round((inrAmount / INR_PER_USD) * 10000) / 10000;
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('balance, total_spent')
    .eq('user_id', targetUserId)
    .maybeSingle();
  if (!wallet) throw new Error('Wallet not found for target user');

  const balance = Number(wallet.balance ?? 0);
  const spent = Number(wallet.total_spent ?? 0);
  let newBalance: number;
  if (action === 'add') {
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
    .eq('user_id', targetUserId)
    .maybeSingle();

  // Audit trail FIRST (wallet credit trigger requires a matching transaction row).
  const { error: txErr } = await supabaseAdmin.from('transactions').insert({
    user_id: targetUserId,
    type: action === 'add' ? 'deposit' : 'admin_adjustment',
    amount: action === 'add' ? usdAmount : -usdAmount,
    balance_after: newBalance,
    status: 'completed',
    payment_method: action === 'add' ? 'manual_admin' : null,
    description: `Admin wallet ${action} of ₹${inrAmount} ($${usdAmount}) by ${callerProfile?.email ?? callerId} — ${reason}`,
  });
  if (txErr) throw new Error(`Transaction record failed: ${txErr.message}`);

  const { error: updErr } = await supabaseAdmin
    .from('wallets')
    .update({
      balance: newBalance,
      total_spent:
        action === 'subtract'
          ? Math.max(0, Math.round((spent - usdAmount) * 10000) / 10000)
          : spent,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);
  if (updErr) throw new Error(`Wallet update failed: ${updErr.message}`);

  const { data: auditRow } = await supabaseAdmin
    .from('admin_audit_log')
    .insert({
      actor_id: callerId,
      actor_email: callerProfile?.email ?? null,
      target_user_id: targetUserId,
      target_email: targetProfile?.email ?? null,
      action: action === 'add' ? 'wallet_credit' : 'wallet_debit',
      amount_inr: inrAmount,
      amount_usd: usdAmount,
      notes: reason,
      metadata: {
        inr_amount: inrAmount,
        usd_amount: usdAmount,
        new_balance: newBalance,
        reason,
      },
    })
    .select('id')
    .maybeSingle();

  return {
    success: true,
    new_balance: newBalance,
    audit_id: (auditRow as { id: string } | null)?.id ?? null,
    usd_amount: usdAmount,
    previous_balance: balance,
  };
}
