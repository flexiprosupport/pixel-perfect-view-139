
ALTER TABLE public.organic_run_schedule
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 5;

-- One provider order per run: idempotency guard against double dispatch.
CREATE UNIQUE INDEX IF NOT EXISTS organic_run_schedule_provider_order_uniq
  ON public.organic_run_schedule (provider_account_id, provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_due_engagement_run_ids_v2(p_limit integer)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id FROM (
    SELECT DISTINCT ON (rs.engagement_order_item_id)
           rs.id, rs.engagement_order_item_id, rs.scheduled_at
    FROM public.organic_run_schedule rs
    JOIN public.engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id
    JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
    WHERE rs.engagement_order_item_id IS NOT NULL
      AND rs.provider_order_id IS NULL
      AND eoi.status NOT IN ('paused','cancelled')
      AND eo.status NOT IN ('paused','cancelled')
      AND (
        (rs.status = 'pending' AND rs.scheduled_at <= now() + interval '1 minute')
        OR (
          rs.status = 'failed'
          AND COALESCE(rs.retry_count, 0) < COALESCE(rs.max_retries, 5)
          AND COALESCE(rs.next_attempt_at, rs.scheduled_at) <= now()
        )
      )
    ORDER BY rs.engagement_order_item_id, rs.scheduled_at ASC
  ) r
  ORDER BY r.scheduled_at ASC
  LIMIT GREATEST(1, p_limit);
$$;

REVOKE ALL ON FUNCTION public.get_due_engagement_run_ids_v2(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_due_engagement_run_ids_v2(integer) TO service_role;

CREATE TABLE IF NOT EXISTS public.wallet_reconciliation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  wallets_checked integer NOT NULL DEFAULT 0,
  mismatch_count integer NOT NULL DEFAULT 0,
  total_drift numeric NOT NULL DEFAULT 0,
  mismatches jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_reconciliation_reports TO authenticated;
GRANT ALL ON public.wallet_reconciliation_reports TO service_role;

ALTER TABLE public.wallet_reconciliation_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view reconciliation reports" ON public.wallet_reconciliation_reports;
CREATE POLICY "Admins view reconciliation reports"
  ON public.wallet_reconciliation_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.reconcile_wallets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
  v_count integer;
  v_drift numeric;
  v_checked integer;
  v_id uuid;
BEGIN
  SELECT count(*) INTO v_checked FROM public.wallets;

  WITH ledger AS (
    SELECT w.user_id,
           COALESCE(w.balance, 0) AS balance,
           COALESCE((
             SELECT sum(CASE WHEN t.type IN ('debit','purchase','order') THEN -abs(t.amount) ELSE abs(t.amount) END)
             FROM public.transactions t
             WHERE t.user_id = w.user_id
               AND COALESCE(t.status, 'completed') <> 'failed'
           ), 0) AS ledger_balance
    FROM public.wallets w
    WHERE w.user_id IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', user_id,
           'wallet_balance', round(balance, 4),
           'ledger_balance', round(ledger_balance, 4),
           'drift', round(balance - ledger_balance, 4)
         )), '[]'::jsonb),
         count(*),
         COALESCE(sum(abs(balance - ledger_balance)), 0)
    INTO v_rows, v_count, v_drift
  FROM ledger
  WHERE abs(balance - ledger_balance) > 0.01;

  INSERT INTO public.wallet_reconciliation_reports (wallets_checked, mismatch_count, total_drift, mismatches)
  VALUES (v_checked, v_count, v_drift, v_rows)
  RETURNING id INTO v_id;

  IF v_count > 0 THEN
    INSERT INTO public.admin_audit_log (action, notes, metadata)
    VALUES (
      'wallet_reconciliation_mismatch',
      v_count || ' wallet(s) do not match their transaction ledger (total drift ' || v_drift || ')',
      jsonb_build_object('report_id', v_id, 'mismatches', v_rows)
    );
  END IF;

  RETURN jsonb_build_object(
    'report_id', v_id,
    'wallets_checked', v_checked,
    'mismatch_count', v_count,
    'total_drift', v_drift,
    'mismatches', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_wallets() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_wallets() TO service_role;

SELECT cron.unschedule('daily-wallet-reconciliation')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-wallet-reconciliation');

SELECT cron.schedule(
  'daily-wallet-reconciliation',
  '30 1 * * *',
  $$ SELECT public.reconcile_wallets(); $$
);
