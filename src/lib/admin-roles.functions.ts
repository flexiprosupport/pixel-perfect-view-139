import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const roleSchema = z.object({
  target_user_id: z.string().uuid(),
  role: z.enum(['admin', 'user']),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(300),
});

/** Super-admin only: grant or revoke the admin role. */
export const adminSetUserRole = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => roleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const callerId = context.userId as string;
    const { assertSuperAdmin, setUserRole } = await import('@/lib/admin-roles.server');
    await assertSuperAdmin(callerId, context.supabase);
    if (callerId === data.target_user_id && data.role === 'user') {
      throw new Error('You cannot remove your own admin role');
    }
    return await setUserRole({
      callerId,
      targetUserId: data.target_user_id,
      role: data.role,
      reason: data.reason,
    });
  });

const banSchema = z.object({
  target_user_id: z.string().uuid(),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(300),
});

/** Super-admin only: ban a user and cancel their pending work. */
export const adminBanUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => banSchema.parse(input))
  .handler(async ({ data, context }) => {
    const callerId = context.userId as string;
    const { assertSuperAdmin, SUPER_ADMIN_USER_IDS, writeRoleAudit } = await import(
      '@/lib/admin-roles.server'
    );
    await assertSuperAdmin(callerId, context.supabase);
    if (SUPER_ADMIN_USER_IDS.has(data.target_user_id)) {
      throw new Error('A super-admin account cannot be banned');
    }

    const { data: result, error } = await context.supabase.rpc('admin_ban_user_and_cancel' as never, {
      p_target_user_id: data.target_user_id,
      p_reason: data.reason,
    } as never);
    if (error) throw new Error(error.message);

    await writeRoleAudit({
      callerId,
      targetUserId: data.target_user_id,
      action: 'user_banned',
      notes: data.reason,
      metadata: { result: (result ?? null) as never },
    });

    return { success: true, result: JSON.parse(JSON.stringify(result ?? {})) as unknown as string };
  });

const unbanSchema = z.object({ target_user_id: z.string().uuid() });

/** Super-admin only: lift a ban. */
export const adminUnbanUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => unbanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const callerId = context.userId as string;
    const { assertSuperAdmin, writeRoleAudit } = await import('@/lib/admin-roles.server');
    await assertSuperAdmin(callerId, context.supabase);

    const { data: result, error } = await context.supabase.rpc('admin_unban_user' as never, {
      p_target_user_id: data.target_user_id,
    } as never);
    if (error) throw new Error(error.message);

    await writeRoleAudit({
      callerId,
      targetUserId: data.target_user_id,
      action: 'user_unbanned',
      notes: 'Ban lifted by super-admin',
    });

    return { success: true, result: JSON.parse(JSON.stringify(result ?? {})) as unknown as string };
  });
