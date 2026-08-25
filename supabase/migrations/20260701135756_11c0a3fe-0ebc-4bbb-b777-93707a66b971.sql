-- Drop Plisio completely
DROP FUNCTION IF EXISTS public.credit_wallet_plisio(text);
DROP TABLE IF EXISTS public.plisio_webhook_events CASCADE;
DROP TABLE IF EXISTS public.plisio_deposits CASCADE;

-- OxaPay deposits table
CREATE TABLE public.oxapay_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  track_id text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd numeric(14,2) NOT NULL CHECK (amount_usd > 0),
  amount_inr numeric(14,2) NOT NULL CHECK (amount_inr > 0),
  pay_currency text,
  status text NOT NULL DEFAULT 'waiting',
  credited boolean NOT NULL DEFAULT false,
  payment_url text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.oxapay_deposits TO authenticated;
GRANT ALL    ON public.oxapay_deposits TO service_role;

ALTER TABLE public.oxapay_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own oxapay deposits" ON public.oxapay_deposits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_oxapay_deposits_user ON public.oxapay_deposits(user_id);
CREATE INDEX idx_oxapay_deposits_status ON public.oxapay_deposits(status);
CREATE INDEX idx_oxapay_deposits_track ON public.oxapay_deposits(track_id);

CREATE TRIGGER trg_oxapay_deposits_updated
BEFORE UPDATE ON public.oxapay_deposits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OxaPay webhook events (audit + replay protection)
CREATE TABLE public.oxapay_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_hash text UNIQUE NOT NULL,
  order_id text,
  track_id text,
  status text,
  signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  source_ip text,
  payload jsonb,
  credit_result jsonb,
  notes text,
  received_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.oxapay_webhook_events TO authenticated;
GRANT ALL    ON public.oxapay_webhook_events TO service_role;

ALTER TABLE public.oxapay_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read oxapay events" ON public.oxapay_webhook_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_oxapay_events_order ON public.oxapay_webhook_events(order_id);
CREATE INDEX idx_oxapay_events_received ON public.oxapay_webhook_events(received_at DESC);

-- Guard: only service_role can flip oxapay_deposits to paid/credited or set credited=true
CREATE OR REPLACE FUNCTION public.guard_oxapay_deposit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Allow service_role unconditionally
  IF v_role = 'service_role' OR current_user IN ('postgres','supabase_admin','service_role') THEN
    RETURN NEW;
  END IF;

  -- Non-service callers cannot flip credited=true or move status to a paid state
  IF NEW.credited IS DISTINCT FROM OLD.credited AND NEW.credited = true THEN
    RAISE EXCEPTION 'Forbidden: only backend can mark oxapay deposit credited';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND lower(NEW.status) IN ('paid','confirmed','completed','success') THEN
    RAISE EXCEPTION 'Forbidden: only backend can promote oxapay deposit status to %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_oxapay_deposit_change
BEFORE UPDATE ON public.oxapay_deposits
FOR EACH ROW EXECUTE FUNCTION public.guard_oxapay_deposit_change();

-- Atomic wallet credit RPC — service_role only
CREATE OR REPLACE FUNCTION public.credit_wallet_oxapay(p_order_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dep record;
  v_balance numeric;
  v_deposited numeric;
  v_new_balance numeric;
  v_amount numeric;
  v_tx_id uuid;
  v_lock_key bigint;
BEGIN
  IF COALESCE(btrim(p_order_id),'') = '' THEN
    RAISE EXCEPTION 'order_id required';
  END IF;

  v_lock_key := abs(hashtextextended(p_order_id, 88));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_dep FROM public.oxapay_deposits WHERE order_id = p_order_id FOR UPDATE;
  IF v_dep.id IS NULL THEN
    RAISE EXCEPTION 'Deposit not found: %', p_order_id;
  END IF;

  IF v_dep.credited THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_dep.user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance,0));
  END IF;

  IF lower(v_dep.status) NOT IN ('paid','confirmed','completed','success') THEN
    RETURN json_build_object('credited', false, 'reason', 'not_success', 'status', v_dep.status);
  END IF;

  v_amount := ROUND(v_dep.amount_inr::numeric, 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'invalid credit amount';
  END IF;

  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (v_dep.user_id, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, total_deposited INTO v_balance, v_deposited
  FROM public.wallets WHERE user_id = v_dep.user_id FOR UPDATE;

  v_new_balance := ROUND(COALESCE(v_balance,0) + v_amount, 2);

  -- Insert transaction FIRST (enforce_wallet_credit_trail requires it within 5s)
  INSERT INTO public.transactions (
    user_id, type, amount, balance_after, status, payment_method, payment_reference, description
  ) VALUES (
    v_dep.user_id, 'deposit', v_amount, v_new_balance, 'completed', 'oxapay', p_order_id,
    'OxaPay crypto deposit ($' || v_dep.amount_usd || ' ≈ ₹' || v_dep.amount_inr ||
    COALESCE(' via ' || v_dep.pay_currency, '') || ')'
  ) RETURNING id INTO v_tx_id;

  UPDATE public.wallets
     SET balance = v_new_balance,
         total_deposited = ROUND(COALESCE(v_deposited,0) + v_amount, 2),
         updated_at = now()
   WHERE user_id = v_dep.user_id;

  UPDATE public.oxapay_deposits
     SET credited = true, updated_at = now()
   WHERE order_id = p_order_id;

  RETURN json_build_object(
    'credited', true,
    'duplicate', false,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'credited_inr', v_amount,
    'credited_usd', v_dep.amount_usd
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credit_wallet_oxapay(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.credit_wallet_oxapay(text) TO service_role;

-- Also allow 'oxapay' as a known payment_method for enforce_deposit_provenance
CREATE OR REPLACE FUNCTION public.enforce_deposit_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'completed' THEN
    IF NEW.payment_method IS NULL OR NEW.payment_method NOT IN (
      'zapupi', 'oxapay', 'manual_admin', 'razorpay', 'usdt_bep20', 'razorpay_manual', 'legacy_admin'
    ) THEN
      RAISE EXCEPTION 'Forbidden: deposit requires a known payment_method (got: %).', COALESCE(NEW.payment_method, 'NULL');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;