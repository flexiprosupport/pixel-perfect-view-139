/**
 * SMM-panel (api/v2) provider client helpers. Server-only.
 */

export interface RawProviderService {
  service: string | number;
  name: string;
  category: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  dripfeed?: boolean | string;
  refill?: boolean | string;
  cancel?: boolean | string;
  type?: string;
}

export interface NormalizedProviderService {
  service_id: string;
  name: string;
  category: string;
  rate: number;
  min: number;
  max: number;
  dripfeed: boolean;
  refill: boolean;
  cancel: boolean;
  type: string | null;
}

const bool = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
const numOr = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** POST form-encoded request to an SMM panel API and parse JSON. */
export async function callProviderApi(
  apiUrl: string,
  apiKey: string,
  params: Record<string, string | number>,
): Promise<any> {
  const body = new URLSearchParams({ key: apiKey });
  for (const [k, v] of Object.entries(params)) body.append(k, String(v));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    throw new Error(
      err?.name === 'AbortError'
        ? 'Provider API timed out (30s). Check the API URL.'
        : `Could not reach provider API: ${err?.message ?? 'network error'}`,
    );
  }
  clearTimeout(timeout);

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Provider API error [${res.status}]: ${text.slice(0, 300)}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Provider API returned a non-JSON response: ${text.slice(0, 200)}`);
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.error) {
    throw new Error(String(parsed.error));
  }
  return parsed;
}

export function normalizeService(raw: RawProviderService): NormalizedProviderService {
  return {
    service_id: String(raw.service),
    name: String(raw.name ?? '').trim(),
    category: String(raw.category ?? 'Other').trim() || 'Other',
    rate: numOr(raw.rate, 0),
    min: Math.max(1, Math.floor(numOr(raw.min, 10))),
    max: Math.max(1, Math.floor(numOr(raw.max, 100000))),
    dripfeed: bool(raw.dripfeed),
    refill: bool(raw.refill),
    cancel: bool(raw.cancel),
    type: raw.type ? String(raw.type) : null,
  };
}

/** Fetch and normalize the provider service catalogue. */
export async function fetchCatalogue(apiUrl: string, apiKey: string) {
  const data = await callProviderApi(apiUrl, apiKey, { action: 'services' });
  const list: RawProviderService[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.services)
      ? data.services
      : [];
  if (!list.length) throw new Error('Provider returned an empty service list');
  return list.map(normalizeService);
}

/** Fetch the account balance from the provider. */
export async function fetchBalance(apiUrl: string, apiKey: string) {
  const data = await callProviderApi(apiUrl, apiKey, { action: 'balance' });
  return {
    balance: numOr(data?.balance, 0),
    currency: typeof data?.currency === 'string' ? data.currency : 'USD',
  };
}

// ---------------------------------------------------------------------------
// Admin-facing operations (called from src/lib/providers.functions.ts)
// ---------------------------------------------------------------------------

export async function assertAdmin(client: any, userId: string) {
  const { data: isAdmin, error } = await client.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });
  if (error) throw new Error('Could not verify admin role');
  if (!isAdmin) throw new Error('Admins only');
}

/** Pick the highest-priority active account for a provider id. */
export async function primaryAccount(admin: any, providerId: string) {
  const { data, error } = await admin
    .from('provider_accounts')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No active account configured for provider "${providerId}"`);
  return data;
}

/** services.provider_id has an FK to providers — make sure the row exists. */
export async function ensureProviderRow(admin: any, account: {
  provider_id: string;
  name: string;
  api_url: string;
  api_key: string;
}) {
  const { error } = await admin.from('providers').upsert(
    {
      id: account.provider_id,
      name: account.provider_id,
      api_url: account.api_url,
      api_key: account.api_key,
      is_active: true,
    },
    { onConflict: 'id', ignoreDuplicates: false },
  );
  if (error) throw new Error(`Could not register provider: ${error.message}`);
}

export async function importServicesCore(
  admin: any,
  opts: {
    provider_id: string;
    service_ids: string[];
    markup_percent?: number;
    category_override?: string | null;
  },
) {
  const account = await primaryAccount(admin, opts.provider_id);
  await ensureProviderRow(admin, account);

  const catalogue = await fetchCatalogue(account.api_url, account.api_key);
  const byId = new Map(catalogue.map((s) => [s.service_id, s]));
  const markup = 1 + (opts.markup_percent ?? 0) / 100;

  const { data: existing } = await admin
    .from('services')
    .select('id, provider_service_id')
    .eq('provider_id', opts.provider_id)
    .in('provider_service_id', opts.service_ids);

  const existingMap = new Map<string, string>(
    (existing ?? []).map((r: any) => [r.provider_service_id, r.id]),
  );

  let imported = 0;
  let updated = 0;
  const missing: string[] = [];

  for (const psid of opts.service_ids) {
    const svc = byId.get(String(psid));
    if (!svc) {
      missing.push(String(psid));
      continue;
    }

    const row = {
      provider_id: opts.provider_id,
      provider_service_id: svc.service_id,
      name: svc.name,
      category: opts.category_override || svc.category,
      price: Math.round(svc.rate * markup * 10000) / 10000,
      min_quantity: svc.min,
      max_quantity: svc.max,
      drip_feed_enabled: svc.dripfeed,
      refill: svc.refill ? 'Yes' : 'No',
      cancel_allowed: svc.cancel ? 'Yes' : 'No',
      is_active: true,
    };

    const existingId = existingMap.get(svc.service_id);
    if (existingId) {
      const { error } = await admin.from('services').update(row).eq('id', existingId);
      if (error) throw new Error(error.message);
      updated++;
      await linkMapping(admin, existingId, account.id, svc.service_id);
    } else {
      const { data: inserted, error } = await admin
        .from('services')
        .insert(row)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      imported++;
      await linkMapping(admin, inserted.id, account.id, svc.service_id);
    }
  }

  return { imported, updated, missing };
}

async function linkMapping(
  admin: any,
  serviceId: string,
  accountId: string,
  providerServiceId: string,
) {
  await admin.from('service_provider_mapping').upsert(
    {
      service_id: serviceId,
      provider_account_id: accountId,
      provider_service_id: providerServiceId,
      is_active: true,
    },
    { onConflict: 'service_id,provider_account_id' },
  );
}

/** Refresh prices/limits of every imported service from its provider catalogue. */
export async function syncPricesCore(admin: any) {
  const { data: accounts } = await admin
    .from('provider_accounts')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  const seen = new Set<string>();
  let updated = 0;
  const errors: string[] = [];

  for (const account of accounts ?? []) {
    if (seen.has(account.provider_id)) continue;
    seen.add(account.provider_id);

    const { data: services } = await admin
      .from('services')
      .select('id, provider_service_id')
      .eq('provider_id', account.provider_id);
    if (!services?.length) continue;

    let catalogue;
    try {
      catalogue = await fetchCatalogue(account.api_url, account.api_key);
    } catch (err: any) {
      errors.push(`${account.provider_id}: ${err.message}`);
      continue;
    }
    const byId = new Map(catalogue.map((s) => [s.service_id, s]));

    for (const svc of services) {
      const remote = byId.get(String(svc.provider_service_id));
      if (!remote) continue;
      const { error } = await admin
        .from('services')
        .update({
          price: Math.round(remote.rate * 10000) / 10000,
          min_quantity: remote.min,
          max_quantity: remote.max,
          drip_feed_enabled: remote.dripfeed,
        })
        .eq('id', svc.id);
      if (!error) updated++;
    }
  }

  return { updated, errors };
}

/** Refresh provider_accounts.balance for every active account. */
export async function syncBalancesCore(admin: any) {
  const { data: accounts } = await admin
    .from('provider_accounts')
    .select('id, api_url, api_key, is_active')
    .eq('is_active', true);

  let ok = 0;
  const failed: string[] = [];

  for (const account of accounts ?? []) {
    try {
      const { balance, currency } = await fetchBalance(account.api_url, account.api_key);
      await admin
        .from('provider_accounts')
        .update({
          balance,
          balance_currency: currency,
          balance_checked_at: new Date().toISOString(),
          last_balance_error: null,
        })
        .eq('id', account.id);
      ok++;
    } catch (err: any) {
      failed.push(account.id);
      await admin
        .from('provider_accounts')
        .update({
          balance_checked_at: new Date().toISOString(),
          last_balance_error: String(err?.message ?? 'unknown error').slice(0, 300),
        })
        .eq('id', account.id);
    }
  }

  return { checked: ok, failed: failed.length };
}
