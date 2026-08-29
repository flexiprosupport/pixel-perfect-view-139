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
