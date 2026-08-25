UPDATE public.plisio_deposits SET status='completed' WHERE order_id='test-plisio-rate90-001';
SELECT public.credit_wallet_plisio('test-plisio-rate90-001') AS credit_result;
SELECT amount, balance_after, payment_method, payment_reference, description, status
  FROM public.transactions WHERE payment_reference='test-plisio-rate90-001';
SELECT event_hash IS NOT NULL AS event_logged, signature_valid, notes, status
  FROM public.plisio_webhook_events WHERE order_id='test-plisio-rate90-001';
-- cleanup
DELETE FROM public.transactions WHERE payment_reference='test-plisio-rate90-001';
UPDATE public.wallets SET balance = balance - 2.0000, total_deposited = total_deposited - 2.0000
  WHERE user_id='581a69bb-fe78-4da6-98cd-f36fdeff8f28';
DELETE FROM public.plisio_deposits WHERE order_id='test-plisio-rate90-001';
DELETE FROM public.plisio_webhook_events WHERE order_id='test-plisio-rate90-001';