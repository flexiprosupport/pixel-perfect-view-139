import { createFileRoute } from '@tanstack/react-router';
import { logApiCall } from '@/lib/api-audit.server';

/**
 * Landing endpoint the gateway redirects to after payment.
 * Kicks off a server-side settle attempt (so the wallet is credited even if the
 * user closes the tab) and then bounces back to /wallet with the order id.
 */
export const Route = createFileRoute('/api/public/zapupi-return')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get('deposit_order_id') ?? '';
        const status = url.searchParams.get('status') ?? 'success';

        if (/^ZAP_[a-f0-9]{16,64}$/i.test(orderId) && status === 'success') {
          try {
            const { settleZapupiOrder } = await import('@/lib/zapupi.server');
            await settleZapupiOrder({
              orderId,
              payload: { source: 'return', order_id: orderId, status },
              source: 'sync',
            });
          } catch (e) {
            console.error('[zapupi] return settle failed', e);
          }
        }

        const target = new URL('/wallet', url.origin);
        if (orderId) target.searchParams.set('zapupi_order_id', orderId);
        target.searchParams.set('status', status);

        await logApiCall(request, {
          endpoint: '/api/public/zapupi-return',
          method: 'GET',
          action: 'return',
          statusCode: 302,
          success: status === 'success',
          metadata: { order_id: orderId, status },
        });

        return new Response(null, {
          status: 302,
          headers: { Location: target.toString(), 'Cache-Control': 'no-store' },
        });
      },
    },
  },
});
