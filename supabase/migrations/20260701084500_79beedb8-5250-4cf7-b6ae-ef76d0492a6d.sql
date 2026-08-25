
-- Plisio crypto deposits table
CREATE TABLE public.plisio_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id text UNIQUE NOT NULL,
  invoice_id text,
  amount_inr numeric(14,2) NOT NULL CHECK (amount_inr > 0),
  source_currency text NOT NULL DEFAULT 'INR',
  pay_currency text,
  pay_amount numeric(28,10),
  status text NOT NULL DEFAULT 'pending',
  credited boolean NOT NULL DEFAULT false,
  invoice_url text,
  qr_code text,
  wallet_hash text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plisio_deposits_user ON public.plisio_deposits(user_id);
CREATE INDEX idx_plisio_deposits_status ON public.plisio_deposits(status);

GRANT SELECT ON public.plisio_deposits TO authenticated;
GRANT ALL   ON public.plisio_deposits TO service_role;

ALTER TABLE public.plisio_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own plisio deposits"
  ON public.plisio_deposits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_plisio_deposits_updated
  BEFORE UPDATE ON public.plisio_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Webhook events audit / replay protection
CREATE TABLE public.plisio_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_hash text UNIQUE NOT NULL,
  order_id text,
  invoice_id text,
  status text,
  signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  source_ip text,
  payload jsonb,
  credit_result jsonb,
  notes text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plisio_events_order ON public.plisio_webhook_events(order_id);

GRANT ALL ON public.plisio_webhook_events TO service_role;

ALTER TABLE public.plisio_webhook_events ENABLE ROW LEVEL SECURITY;
-- No client policies. Service role only.

-- Credit wallet RPC (mirrors credit_wallet_zapupi pattern, USD balance stored)
CREATE OR REPLACE FUNCTION public.credit_wallet_plisio(p_order_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key bigint;
  v_dep record;
  v_balance numeric;
  v_deposited numeric;
  v_new_balance numeric;
  v_credit_usd numeric;
  v_rate numeric := 83.5;
  v_tx_id uuid;
BEGIN
  IF COALESCE(btrim(p_order_id),'') = '' THEN
    RAISE EXCEPTION 'order_id required';
  END IF;

  v_lock_key := abs(hashtextextended(p_order_id, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_dep FROM public.plisio_deposits
   WHERE order_id = p_order_id FOR UPDATE;

  IF v_dep.id IS NULL THEN
    RAISE EXCEPTION 'Deposit order not found';
  END IF;

  IF v_dep.credited THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_dep.user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance,0));
  END IF;

  IF v_dep.status NOT IN ('completed','success') THEN
    RETURN json_build_object('credited', false, 'reason','not_success','status', v_dep.status);
  END IF;

  v_credit_usd := trunc((v_dep.amount_inr::numeric / v_rate)::numeric, 4);
  IF v_credit_usd <= 0 THEN
    RAISE EXCEPTION 'invalid credit amount';
  END IF;

  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (v_dep.user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance, total_deposited INTO v_balance, v_deposited
  FROM public.wallets WHERE user_id = v_dep.user_id FOR UPDATE;

  v_new_balance := trunc(COALESCE(v_balance,0) + v_credit_usd, 4);

  -- Transaction row FIRST (enforce_wallet_credit_trail requires it before balance update)
  INSERT INTO public.transactions (
    user_id, type, amount, balance_after, status,
    payment_method, payment_reference, description
  ) VALUES (
    v_dep.user_id, 'deposit', v_credit_usd, v_new_balance, 'completed',
    'plisio', p_order_id,
    'Wallet top-up via Plisio (₹' || trim(to_char(v_dep.amount_inr,'FM9999999990D00')) || ')'
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.wallets
     SET balance = v_new_balance,
         total_deposited = trunc(COALESCE(v_deposited,0) + v_credit_usd, 4),
         updated_at = now()
   WHERE user_id = v_dep.user_id;

  UPDATE public.plisio_deposits
     SET credited = true, status = 'success', updated_at = now()
   WHERE id = v_dep.id;

  RETURN json_build_object(
    'credited', true, 'duplicate', false,
    'transaction_id', v_tx_id,
    'new_balance', v_new_balance,
    'credited_usd', v_credit_usd,
    'credited_inr', v_dep.amount_inr
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credit_wallet_plisio(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_plisio(text) TO service_role;

-- Allow 'plisio' as a valid deposit payment_method in the enforce_deposit_provenance trigger
CREATE OR REPLACE FUNCTION public.enforce_deposit_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'completed' THEN
    IF NEW.payment_method IS NULL OR NEW.payment_method NOT IN (
      'zapupi', 'plisio', 'manual_admin', 'razorpay', 'usdt_bep20', 'razorpay_manual', 'legacy_admin'
    ) THEN
      RAISE EXCEPTION 'Forbidden: deposit requires a known payment_method (got: %).', COALESCE(NEW.payment_method, 'NULL');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
