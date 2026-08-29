/**
 * Server-only helpers for public API observability:
 *  - persistent audit logging of every public endpoint action
 *  - persistent (DB-backed) rate limiting, since workers are stateless
 *
 * Both use the service-role client: `api_audit_log` is insert-only for the
 * system, and `api_rate_limits` has no policies at all (deny-all under RLS).
 */

export type AuditEntry = {
  endpoint: string;
  method: string;
  action?: string | null;
  userId?: string | null;
  apiKey?: string | null;
  statusCode: number;
  success: boolean;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Never store the raw key — only a short, non-reversible prefix for support. */
export function keyPrefix(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export async function logApiCall(request: Request, entry: AuditEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('api_audit_log').insert({
      user_id: entry.userId ?? null,
      api_key_prefix: keyPrefix(entry.apiKey),
      endpoint: entry.endpoint,
      action: entry.action ?? null,
      method: entry.method,
      status_code: entry.statusCode,
      success: entry.success,
      ip_address: clientIp(request),
      user_agent: request.headers.get('user-agent'),
      error_message: entry.errorMessage ?? null,
      metadata: entry.metadata ?? {},
    } as never);
  } catch (err) {
    // Audit logging must never break the API response.
    console.error('[api-audit] failed to write audit entry', err);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfter: number };

/**
 * Fixed-window counter keyed by bucket (api key or IP).
 * Fails open on infrastructure errors so a logging outage cannot take the API down.
 */
export async function rateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin.rpc('api_rate_limit_hit' as never, {
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    } as never);
    if (error) {
      console.error('[api-rate-limit] rpc failed', error.message);
      return { allowed: true, retryAfter: 0 };
    }
    const result = data as unknown as { allowed?: boolean; retry_after?: number } | null;
    return {
      allowed: result?.allowed !== false,
      retryAfter: Number(result?.retry_after ?? windowSeconds),
    };
  } catch (err) {
    console.error('[api-rate-limit] failed', err);
    return { allowed: true, retryAfter: 0 };
  }
}
