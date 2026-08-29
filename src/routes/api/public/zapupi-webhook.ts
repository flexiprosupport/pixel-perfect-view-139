import { createFileRoute } from '@tanstack/react-router';
import { clientIp, logApiCall, rateLimit } from '@/lib/api-audit.server';

/**
 * ZapUPI payment callback.
 *
 * Security model:
 *  - Optional shared secret (`ZAPUPI_WEBHOOK_SECRET`) checked as `?token=` — ZapUPI
 *    does not sign callbacks, so the secret in the URL is the signature substitute.
 *  - The payload is NEVER trusted: every callback is re-verified against ZapUPI's
 *    order-status API and the paid amount must match the stored deposit amount.
 *  - Idempotency: each callback is fingerprinted into `zapupi_webhook_events.event_key`
 *    (unique) and the deposit's `credited` flag + SQL credit function block double credit.
 *  - Always answers 200 so the gateway does not enter a retry storm.
 */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function readPayload(request: Request): Promise<{ payload: any; raw: string }> {
  const raw = await request.text();
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try {
      return { payload: JSON.parse(raw), raw };
    } catch {
      /* fall through */
    }
  }
  try {
    return { payload: JSON.parse(raw), raw };
  } catch {
    return { payload: Object.fromEntries(new URLSearchParams(raw).entries()), raw };
  }
}

export const Route = createFileRoute('/api/public/zapupi-webhook')({
  server: {
    handlers: {
      OPTIONS: async () => new Response('ok', { status: 204 }),

      GET: async () => json({ ok: true, endpoint: 'zapupi-webhook', method: 'POST' }),

      POST: async ({ request }) => {
        const secret = process.env['ZAPUPI_WEBHOOK_SECRET'];
        const url = new URL(request.url);

        const limit = await rateLimit(`zapupi-webhook:ip:${clientIp(request)}`, 120, 60);
        if (!limit.allowed) {
          await logApiCall(request, {
            endpoint: '/api/public/zapupi-webhook',
            method: 'POST',
            action: 'webhook',
            statusCode: 429,
            success: false,
            errorMessage: 'rate limit exceeded',
          });
          return new Response('Too many requests', {
            status: 429,
            headers: { 'Retry-After': String(limit.retryAfter) },
          });
        }

        if (secret && url.searchParams.get('token') !== secret) {
          await logApiCall(request, {
            endpoint: '/api/public/zapupi-webhook',
            method: 'POST',
            action: 'webhook',
            statusCode: 401,
            success: false,
            errorMessage: 'invalid token',
          });
          return new Response('Invalid token', { status: 401 });
        }

        try {
          const { payload, raw } = await readPayload(request);
          const orderId: string | undefined =
            payload?.order_id || payload?.orderId || payload?.data?.order_id;
          if (!orderId) return json({ ok: true, note: 'no order_id' });

          const headers: Record<string, string> = {};
          request.headers.forEach((v, k) => {
            if (!/authorization|cookie|api-key|secret/i.test(k)) headers[k] = v;
          });

          const { settleZapupiOrder } = await import('@/lib/zapupi.server');
          const result = await settleZapupiOrder({
            orderId,
            payload,
            source: 'webhook',
            meta: {
              http_method: 'POST',
              headers,
              source_ip:
                request.headers.get('x-forwarded-for') ??
                request.headers.get('cf-connecting-ip') ??
                null,
              user_agent: request.headers.get('user-agent'),
              raw_body: raw.length > 20000 ? `${raw.slice(0, 20000)}…[truncated]` : raw,
            },
          });

          await logApiCall(request, {
            endpoint: '/api/public/zapupi-webhook',
            method: 'POST',
            action: 'webhook',
            statusCode: 200,
            success: true,
            metadata: { order_id: orderId },
          });

          return json(result);
        } catch (e) {
          console.error('[zapupi] webhook error', e);
          await logApiCall(request, {
            endpoint: '/api/public/zapupi-webhook',
            method: 'POST',
            action: 'webhook',
            statusCode: 200,
            success: false,
            errorMessage: String((e as Error).message ?? e),
          });
          return json({ ok: true, error: String((e as Error).message ?? e) });
        }
      },
    },
  },
});
