ALTER TABLE public.oxapay_deposits
  ALTER COLUMN amount_usd TYPE numeric(14,4);

ALTER TABLE public.oxapay_webhook_events
  ALTER COLUMN expected_amount TYPE numeric(14,4),
  ALTER COLUMN received_amount TYPE numeric(18,8);