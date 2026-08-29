import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import {
  assertAdmin,
  ensureProviderRow,
  fetchBalance,
  fetchCatalogue,
  importServicesCore,
  primaryAccount,
  syncBalancesCore,
  syncPricesCore,
} from './providers.server';

const accountSchema = z.object({
  id: z.string().uuid().optional(),
  provider_id: z.string().trim().min(1, 'Provider ID is required'),
  name: z.string().trim().min(1, 'Account name is required'),
  api_key: z.string().trim().min(4, 'API key is required'),
  api_url: z.string().trim().url('Enter a valid API URL'),
  priority: z.number().int().min(1).max(100).default(1),
  is_active: z.boolean().default(true),
  delivery_multiplier: z.number().min(0.1).max(10).default(1),
});

/** Verify credentials against the provider API without saving anything. */
export const testProviderAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ api_url: z.string().url(), api_key: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId as string);
    const { balance, currency } = await fetchBalance(data.api_url, data.api_key);
    return { ok: true as const, balance, currency };
  });

/** Create/update a provider account after verifying the API credentials. */
export const saveProviderAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => accountSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId as string);

    // Fail fast with a clear message if the provider can't be reached.
    const { balance, currency } = await fetchBalance(data.api_url, data.api_key);

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await ensureProviderRow(supabaseAdmin, data);

    const row = {
      provider_id: data.provider_id,
      name: data.name,
      api_key: data.api_key,
      api_url: data.api_url,
      priority: data.priority,
      is_active: data.is_active,
      delivery_multiplier: data.delivery_multiplier,
      balance,
      balance_currency: currency,
      balance_checked_at: new Date().toISOString(),
      last_balance_error: null,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from('provider_accounts').update(row).eq('id', data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from('provider_accounts').insert(row);
      if (error) throw new Error(error.message);
    }

    return { ok: true as const, balance, currency };
  });

/** Fetch (and optionally filter) the provider catalogue for the import dialog. */
export const fetchProviderServices = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        provider_id: z.string().min(1),
        search_query: z.string().optional().default(''),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId as string);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const account = await primaryAccount(supabaseAdmin, data.provider_id);
    const catalogue = await fetchCatalogue(account.api_url, account.api_key);

    const q = data.search_query.trim().toLowerCase();
    const filtered = q
      ? catalogue.filter(
          (s) =>
            s.service_id.includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q),
        )
      : catalogue;

    return {
      services: filtered.slice(0, 500),
      total: catalogue.length,
      filtered: filtered.length,
    };
  });

/** Import/refresh specific provider services into the local catalogue. */
export const importProviderServices = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        provider_id: z.string().min(1),
        service_ids: z.array(z.string().min(1)).min(1, 'Select at least one service'),
        markup_percent: z.number().min(0).max(500).optional().default(0),
        category_override: z.string().trim().min(1).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId as string);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    return importServicesCore(supabaseAdmin, data);
  });

/** Refresh prices/limits for all imported services. */
export const syncProviderPrices = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId as string);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    return syncPricesCore(supabaseAdmin);
  });

/** Refresh provider account balances. */
export const syncProviderBalances = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId as string);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    return syncBalancesCore(supabaseAdmin);
  });
