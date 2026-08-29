import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const schema = z.object({
  target_user_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().max(1000).optional(),
  link: z.string().max(300).optional(),
});

/** Admin-only: push an in-app notification to a user. */
export const notifyUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import('@/lib/providers.server');
    await assertAdmin(context.supabase, context.userId as string);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: data.target_user_id,
      title: data.title,
      body: data.body ?? null,
      link: data.link ?? null,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });
