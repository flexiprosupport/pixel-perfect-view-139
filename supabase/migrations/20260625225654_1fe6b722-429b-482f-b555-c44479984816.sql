
-- Hard guards so the same payment can never be credited twice, even if RPC/code is bypassed.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_zapupi_deposits_txn_id
  ON public.zapupi_deposits (txn_id)
  WHERE txn_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_zapupi_deposits_utr
  ON public.zapupi_deposits (utr)
  WHERE utr IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tx_zapupi_payment_ref
  ON public.transactions (payment_reference)
  WHERE payment_method = 'zapupi' AND payment_reference IS NOT NULL;
