import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const runSchema = z.object({
  run_number: z.number().int().positive().optional(),
  scheduled_at: z.string(),
  quantity_to_send: z.number().int().positive(),
  base_quantity: z.number().int().positive().optional(),
  variance_applied: z.number().optional(),
  peak_multiplier: z.number().optional(),
});

const placeSchema = z.object({
  bundle_id: z.string().uuid().nullish(),
  link: z.string().min(4),
  base_quantity: z.number().int().positive(),
  is_organic_mode: z.boolean().optional(),
  engagements: z
    .array(
      z.object({
        type: z.string().min(1),
        quantity: z.number().int().positive(),
        service_id: z.string().uuid().nullish(),
        time_limit_hours: z.number().optional(),
        variance_percent: z.number().optional(),
        peak_hours_enabled: z.boolean().optional(),
        scheduled_runs: z.array(runSchema).optional(),
      }),
    )
    .min(1),
});

/** Place an engagement order for the signed-in user (pricing recomputed server-side). */
export const placeEngagementOrderFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => placeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { placeEngagementOrder } = await import('@/lib/engagement.server');
    return await placeEngagementOrder(context.userId as string, {
      bundle_id: data.bundle_id ?? null,
      link: data.link,
      base_quantity: data.base_quantity,
      is_organic_mode: data.is_organic_mode ?? true,
      engagements: data.engagements.map((e) => ({
        ...e,
        service_id: e.service_id ?? null,
      })),
    });
  });

/** Dispatch every due run to the provider (any signed-in user may trigger their own tick). */
export const executeDueRunsFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => ({
    limit: Math.min(50, Math.max(1, input?.limit ?? 25)),
  }))
  .handler(async ({ data }) => {
    const { executeDueRuns } = await import('@/lib/engagement.server');
    return await executeDueRuns(data.limit);
  });

/** Refresh provider status for one run, or for all in-flight runs. */
export const syncRunStatusFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId?: string } | undefined) => ({ runId: input?.runId }))
  .handler(async ({ data }) => {
    const { syncRunStatus } = await import('@/lib/engagement.server');
    return await syncRunStatus({ runId: data.runId });
  });

/** Admin-only scheduler snapshot for the cron monitor page. */
export const schedulerStatusFn = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import('@/lib/providers.server');
    await assertAdmin(context.supabase, context.userId as string);
    const { schedulerStatus } = await import('@/lib/engagement.server');
    return await schedulerStatus();
  });
