/** Server-only helpers for admin role management. */

// Super-admins: the only accounts allowed to grant/revoke admin and ban users.
export const SUPER_ADMIN_USER_IDS = new Set<string>([
  '581a69bb-fe78-4da6-98cd-f36fdeff8f28', // zyrofit.my@gmail.com
  '82f9bd93-1e39-47ef-bdc0-f579262a122a', // admin@gmail.com (legacy)
  'ff8f0b43-4d5a-4887-b589-77047a3bc9ff', // admin@gmail.com
  '93369079-e17a-4df6-a4a6-1c2a832231b2', // bjkagrahaoamqnvs@gmail.com
  'e067c00a-4c77-4efc-89e1-0c0f814835c3', // flexipro.support@gmail.com (owner)
]);

export async function assertSuperAdmin(callerId: string, supabase: any) {
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId)
    .eq('role', 'admin')
    .maybeSingle();
  if (!roleRow) throw new Error('Admins only');
  if (!SUPER_ADMIN_USER_IDS.has(callerId)) {
    throw new Error('Only a super-admin can manage roles and bans');
  }
  return callerId;
}

export async function writeRoleAudit(params: {
  callerId: string;
  targetUserId: string;
  action: string;
  notes: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('user_id', params.callerId)
    .maybeSingle();
  const { data: targetProfile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('user_id', params.targetUserId)
    .maybeSingle();

  await supabaseAdmin.from('admin_audit_log').insert({
    actor_id: params.callerId,
    actor_email: callerProfile?.email ?? null,
    target_user_id: params.targetUserId,
    target_email: targetProfile?.email ?? null,
    action: params.action,
    notes: params.notes,
    metadata: (params.metadata ?? {}) as never,
  });
}

/** Grant or revoke the admin role for a user (idempotent, works with no existing row). */
export async function setUserRole(params: {
  callerId: string;
  targetUserId: string;
  role: 'admin' | 'user';
  reason: string;
}) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

  if (params.role === 'admin') {
    const { error } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id: params.targetUserId, role: 'admin' },
        { onConflict: 'user_id,role', ignoreDuplicates: true },
      );
    if (error) throw new Error(`Role grant failed: ${error.message}`);
  } else {
    if (SUPER_ADMIN_USER_IDS.has(params.targetUserId)) {
      throw new Error('A super-admin account cannot be demoted');
    }
    const { error } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', params.targetUserId)
      .eq('role', 'admin');
    if (error) throw new Error(`Role revoke failed: ${error.message}`);
    // Keep a base 'user' row so summaries stay consistent.
    await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id: params.targetUserId, role: 'user' },
        { onConflict: 'user_id,role', ignoreDuplicates: true },
      );
  }

  const { data: rows } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', params.targetUserId);
  const effective = (rows ?? []).some((r: { role: string }) => r.role === 'admin')
    ? 'admin'
    : 'user';

  await writeRoleAudit({
    callerId: params.callerId,
    targetUserId: params.targetUserId,
    action: params.role === 'admin' ? 'role_granted_admin' : 'role_revoked_admin',
    notes: params.reason,
    metadata: { requested_role: params.role, effective_role: effective },
  });

  return { success: true, role: effective };
}
