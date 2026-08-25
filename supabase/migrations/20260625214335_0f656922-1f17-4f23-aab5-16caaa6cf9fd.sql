
-- 1. zapupi_deposits table
CREATE TABLE public.zapupi_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  amount_inr numeric NOT NULL CHECK (amount_inr > 0),
  amount_usd numeric,
  status text NOT NULL DEFAULT 'pending',
  credited boolean NOT NULL DEFAULT false,
  txn_id text,
  utr text,
  payment_url text,
  gateway_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_zapupi_deposits_user ON public.zapupi_deposits(user_id);
CREATE INDEX idx_zapupi_deposits_status ON public.zapupi_deposits(status);

GRANT SELECT ON public.zapupi_deposits TO authenticated;
GRANT ALL ON public.zapupi_deposits TO service_role;

ALTER TABLE public.zapupi_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own zapupi deposits"
  ON public.zapupi_deposits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_zapupi_deposits_updated
  BEFORE UPDATE ON public.zapupi_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. credit_wallet_zapupi function (idempotent)
CREATE OR REPLACE FUNCTION public.credit_wallet_zapupi(
  p_order_id text,
  p_txn_id text DEFAULT NULL,
  p_utr text DEFAULT NULL,
  p_gateway_response jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lock_key bigint;
  v_dep record;
  v_balance numeric;
  v_deposited numeric;
  v_new_balance numeric;
  v_credit_usd numeric;
  v_rate numeric := 83.5;
BEGIN
  IF COALESCE(btrim(p_order_id),'') = '' THEN
    RAISE EXCEPTION 'order_id required';
  END IF;

  v_lock_key := abs(hashtextextended(p_order_id, 0));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_dep FROM public.zapupi_deposits WHERE order_id = p_order_id FOR UPDATE;

  IF v_dep.id IS NULL THEN
    RAISE EXCEPTION 'Deposit order not found';
  END IF;

  IF v_dep.credited THEN
    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_dep.user_id;
    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance,0));
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

  UPDATE public.wallets
     SET balance = v_new_balance,
         total_deposited = trunc(COALESCE(v_deposited,0) + v_credit_usd, 4),
         updated_at = now()
   WHERE user_id = v_dep.user_id;

  INSERT INTO public.transactions (
    user_id, type, amount, balance_after, status,
    payment_method, payment_reference, description
  ) VALUES (
    v_dep.user_id, 'deposit', v_credit_usd, v_new_balance, 'completed',
    'zapupi', p_order_id,
    'Wallet top-up via ZapUPI (₹' || trim(to_char(v_dep.amount_inr,'FM9999999990D00')) || ')'
  );

  UPDATE public.zapupi_deposits
     SET status = 'success',
         credited = true,
         amount_usd = v_credit_usd,
         txn_id = COALESCE(p_txn_id, txn_id),
         utr = COALESCE(p_utr, utr),
         gateway_response = COALESCE(p_gateway_response, gateway_response),
         updated_at = now()
   WHERE id = v_dep.id;

  RETURN json_build_object(
    'credited', true,
    'duplicate', false,
    'new_balance', v_new_balance,
    'credited_usd', v_credit_usd,
    'credited_inr', v_dep.amount_inr
  );
END;
$$;

-- 3. Lock down wallet/credit functions: only service_role can EXECUTE
REVOKE EXECUTE ON FUNCTION public.credit_wallet_zapupi(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_zapupi(text, text, text, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.credit_wallet_razorpay(uuid, text, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_razorpay(uuid, text, numeric, numeric) TO service_role;

REVOKE EXECUTE ON FUNCTION public.debit_wallet_for_order(uuid, numeric, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_wallet_for_order(uuid, numeric, uuid, uuid, text) TO service_role;

-- 4. Remove manual deposit INSERT permission (manual flow disabled)
DROP POLICY IF EXISTS "Users create deposits" ON public.deposits;
