-- API audit log ------------------------------------------------------------
CREATE TABLE public.api_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  api_key_prefix text,
  endpoint text NOT NULL,
  action text,
  method text,
  status_code integer,
  success boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_audit_log_user_created ON public.api_audit_log (user_id, created_at DESC);
CREATE INDEX idx_api_audit_log_created ON public.api_audit_log (created_at DESC);

GRANT SELECT ON public.api_audit_log TO authenticated;
GRANT ALL ON public.api_audit_log TO service_role;

ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api audit log"
  ON public.api_audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Rate limiting -------------------------------------------------------------
CREATE TABLE public.api_rate_limits (
  bucket_key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.api_rate_limits TO service_role;

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
-- no policies: only service_role (which bypasses RLS) may touch this table

CREATE OR REPLACE FUNCTION public.api_rate_limit_hit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_row public.api_rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.api_rate_limits (bucket_key, window_start, request_count, updated_at)
  VALUES (p_bucket_key, v_now, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
    SET request_count = CASE
          WHEN public.api_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          THEN 1
          ELSE public.api_rate_limits.request_count + 1
        END,
        window_start = CASE
          WHEN public.api_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
          THEN v_now
          ELSE public.api_rate_limits.window_start
        END,
        updated_at = v_now
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'allowed', v_row.request_count <= p_limit,
    'count', v_row.request_count,
    'limit', p_limit,
    'retry_after', GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_row.window_start + make_interval(secs => p_window_seconds) - v_now)))
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.api_rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_rate_limit_hit(text, integer, integer) TO service_role;