import { createFileRoute } from '@tanstack/react-router';

/**
 * FlexiPro customer API (SMM-panel style).
 *
 * POST /api/public/v2  with JSON or form body:
 *   { key, action: "services" | "add" | "status" | "balance", ... }
 *
 * Security model:
 *  - Auth = customer API key (public.user_api_keys). No admin capability is ever
 *    exposed here: the key only maps to one user_id and every read/write is
 *    hard-scoped to that user. No role checks, no admin actions, no other users' data.
 *  - Banned users are rejected.
 *  - Orders are paid from the caller's own wallet through debit_wallet_for_order.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });
}

function fail(message: string, status = 400) {
  return json({ status: 'error', error: message }, status);
}

async function readBody(request: Request): Promise<Record<string, any>> {
  const raw = await request.text();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const Route = createFileRoute('/api/public/v2')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () =>
        json({
          status: 'ok',
          message: 'FlexiPro API. Send POST requests with { key, action }.',
          actions: ['services', 'add', 'status', 'balance'],
        }),

      POST: async ({ request }) => {
        const body = await readBody(request);
        const key = typeof body['key'] === 'string' ? body['key'].trim() : '';
        const action = typeof body['action'] === 'string' ? body['action'].trim() : '';

        if (!key) return fail('key is required', 401);
        if (!action) return fail('action is required');

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

        const { data: keyRow, error: keyErr } = await supabaseAdmin
          .from('user_api_keys')
          .select('user_id')
          .eq('api_key', key)
          .maybeSingle();

        if (keyErr) return fail('Authentication failed', 500);
        if (!keyRow) return fail('Invalid API key', 401);

        const userId = keyRow.user_id as string;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('is_banned')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile?.is_banned) return fail('Account suspended', 403);

        switch (action) {
          case 'services': {
            const { data, error } = await supabaseAdmin
              .from('services')
              .select('id, name, category, price, min_quantity, max_quantity, refill, cancel_allowed, speed')
              .eq('is_active', true)
              .order('category', { ascending: true });

            if (error) return fail('Could not load services', 500);

            return json({
              status: 'ok',
              services: (data ?? []).map((s) => ({
                service: s.id,
                name: s.name,
                category: s.category,
                rate: Number(s.price ?? 0).toFixed(2), // price per 1000
                min: s.min_quantity,
                max: s.max_quantity,
                refill: s.refill,
                cancel: s.cancel_allowed,
                speed: s.speed,
              })),
            });
          }

          case 'balance': {
            const { data } = await supabaseAdmin
              .from('wallets')
              .select('balance')
              .eq('user_id', userId)
              .maybeSingle();

            return json({
              status: 'ok',
              balance: Number(data?.balance ?? 0).toFixed(2),
              currency: 'INR',
            });
          }

          case 'add': {
            const serviceId = typeof body['service'] === 'string' ? body['service'].trim() : '';
            const link = typeof body['link'] === 'string' ? body['link'].trim() : '';
            const quantity = num(body['quantity']);

            if (!serviceId) return fail('service is required');
            if (!link || !/^https?:\/\//i.test(link)) return fail('A valid link is required');
            if (!quantity || quantity <= 0) return fail('quantity must be a positive number');

            const { data: service } = await supabaseAdmin
              .from('services')
              .select('id, name, price, min_quantity, max_quantity, is_active')
              .eq('id', serviceId)
              .maybeSingle();

            if (!service || !service.is_active) return fail('Invalid service');
            if (quantity < (service.min_quantity ?? 1))
              return fail(`Minimum quantity for this service is ${service.min_quantity}`);
            if (quantity > (service.max_quantity ?? quantity))
              return fail(`Maximum quantity for this service is ${service.max_quantity}`);

            const price = Math.round((Number(service.price ?? 0) / 1000) * quantity * 10000) / 10000;
            if (price <= 0) return fail('This service is not available for API ordering');

            const { data: wallet } = await supabaseAdmin
              .from('wallets')
              .select('balance')
              .eq('user_id', userId)
              .maybeSingle();

            if (Number(wallet?.balance ?? 0) < price)
              return fail('Insufficient balance', 402);

            const { data: order, error: orderErr } = await supabaseAdmin
              .from('orders')
              .insert({
                user_id: userId,
                service_id: service.id,
                link,
                quantity,
                price,
                status: 'pending',
              })
              .select('id, order_number')
              .single();

            if (orderErr || !order) return fail('Could not create order', 500);

            const { error: debitErr } = await supabaseAdmin.rpc('debit_wallet_for_order', {
              p_user_id: userId,
              p_amount: price,
              p_order_id: order.id,
              p_description: `API order #${order.order_number} — ${service.name}`,
            });

            if (debitErr) {
              await supabaseAdmin.from('orders').delete().eq('id', order.id);
              return fail(debitErr.message || 'Payment failed', 402);
            }

            return json({ status: 'ok', order: order.order_number, charge: price.toFixed(4) });
          }

          case 'status': {
            const orderNumber = num(body['order']);
            if (!orderNumber) return fail('order is required');

            const { data: order } = await supabaseAdmin
              .from('orders')
              .select('order_number, status, quantity, remains, price, link, created_at, services(name)')
              .eq('user_id', userId)
              .eq('order_number', orderNumber)
              .maybeSingle();

            if (!order) return fail('Order not found', 404);

            return json({
              status: 'ok',
              order: {
                order_number: order.order_number,
                status: order.status,
                quantity: order.quantity,
                remains: order.remains ?? order.quantity,
                charge: Number(order.price ?? 0).toFixed(4),
                link: order.link,
                service: (order as any).services?.name ?? null,
                created_at: order.created_at,
              },
            });
          }

          default:
            return fail(`Unknown action "${action}"`);
        }
      },
    },
  },
});
