UPDATE public.plisio_deposits SET status='completed' WHERE order_id='test-plisio-webhook-001';
SELECT public.credit_wallet_plisio('test-plisio-webhook-001') AS credit_result;
SELECT balance FROM public.wallets WHERE user_id='581a69bb-fe78-4da6-98cd-f36fdeff8f28';
SELECT id, type, amount, balance_after, payment_method, payment_reference, status FROM public.transactions WHERE payment_reference='test-plisio-webhook-001';
-- cleanup test data
DELETE FROM public.transactions WHERE payment_reference='test-plisio-webhook-001';
UPDATE public.wallets SET balance = balance - (100/83.5)::numeric, total_deposited = total_deposited - (100/83.5)::numeric WHERE user_id='581a69bb-fe78-4da6-98cd-f36fdeff8f28';
DELETE FROM public.plisio_deposits WHERE order_id='test-plisio-webhook-001';
DELETE FROM public.plisio_webhook_events WHERE order_id='test-plisio-webhook-001';