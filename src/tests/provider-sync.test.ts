import { describe, expect, it, vi } from 'vitest';
import { normalizeService, syncPricesCore, withRetry } from '@/lib/providers.server';

/** Minimal chainable stub of the supabase-js query builder. */
function makeAdmin(opts: {
  accounts: any[];
  services: any[];
  onUpdate?: (patch: any, filter: any) => void;
  updateError?: string;
}) {
  const admin: any = {
    from(table: string) {
      const state: any = { table, patch: null, filter: {} };
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          state.filter[col] = val;
          return state.patch ? resolveUpdate() : builder;
        },
        in: (col: string, vals: any[]) => {
          state.filter[col] = vals;
          return state.patch ? resolveUpdate() : builder;
        },
        order: () => builder,
        update: (patch: any) => {
          state.patch = patch;
          return builder;
        },
        then: (resolve: any) =>
          resolve({
            data: table === 'provider_accounts' ? opts.accounts : opts.services,
            error: null,
          }),
      };
      function resolveUpdate() {
        opts.onUpdate?.(state.patch, state.filter);
        return Promise.resolve({
          error: opts.updateError ? { message: opts.updateError } : null,
        });
      }
      return builder;
    },
  };
  return admin;
}

const account = {
  id: 'acc-1',
  provider_id: 'indiasmmpanel',
  api_url: 'https://example.test/api/v2',
  api_key: 'k',
  is_active: true,
  priority: 1,
};

describe('normalizeService', () => {
  it('coerces provider payload fields to safe types', () => {
    const s = normalizeService({
      service: 492,
      name: ' Instagram Views ',
      category: '',
      rate: '1.25',
      min: '0',
      max: 'nope',
      dripfeed: 'true',
    } as any);

    expect(s.service_id).toBe('492');
    expect(s.name).toBe('Instagram Views');
    expect(s.category).toBe('Other');
    expect(s.rate).toBe(1.25);
    expect(s.min).toBe(1);
    expect(s.max).toBe(100000);
    expect(s.dripfeed).toBe(true);
  });
});

describe('withRetry', () => {
  it('retries and finally succeeds', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error('flaky');
        return 'ok';
      },
      3,
      1,
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('throws the last error after exhausting attempts', async () => {
    await expect(withRetry(async () => { throw new Error('down'); }, 2, 1)).rejects.toThrow('down');
  });
});

describe('syncPricesCore', () => {
  it('updates price/limits and marks the service synced', async () => {
    const updates: any[] = [];
    const admin = makeAdmin({
      accounts: [account],
      services: [{ id: 'svc-1', provider_service_id: '492' }],
      onUpdate: (patch, filter) => updates.push({ patch, filter }),
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify([{ service: 492, name: 'Views', category: 'IG', rate: 2, min: 10, max: 5000 }])),
      ),
    );

    const res = await syncPricesCore(admin);
    vi.unstubAllGlobals();

    expect(res.updated).toBe(1);
    expect(res.failed).toBe(0);
    expect(updates[0].patch.price).toBe(2);
    expect(updates[0].patch.min_quantity).toBe(10);
    expect(updates[0].patch.last_price_sync_status).toBe('ok');
    expect(updates[0].patch.last_price_sync_at).toBeTruthy();
  });

  it('flags services missing from the provider catalogue', async () => {
    const updates: any[] = [];
    const admin = makeAdmin({
      accounts: [account],
      services: [{ id: 'svc-9', provider_service_id: '999' }],
      onUpdate: (patch) => updates.push(patch),
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify([{ service: 1, name: 'x', category: 'c', rate: 1, min: 1, max: 2 }])),
      ),
    );

    const res = await syncPricesCore(admin);
    vi.unstubAllGlobals();

    expect(res.updated).toBe(0);
    expect(res.failed).toBe(1);
    expect(updates[0].last_price_sync_status).toBe('missing');
  });

  it('records a failed status when the provider API is unreachable', async () => {
    const updates: any[] = [];
    const admin = makeAdmin({
      accounts: [account],
      services: [{ id: 'svc-1', provider_service_id: '492' }],
      onUpdate: (patch) => updates.push(patch),
    });

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));

    const res = await syncPricesCore(admin);
    vi.unstubAllGlobals();

    expect(res.updated).toBe(0);
    expect(res.failed).toBe(1);
    expect(res.errors[0]).toContain('indiasmmpanel');
    expect(updates[0].last_price_sync_status).toBe('failed');
  }, 15000);
});
