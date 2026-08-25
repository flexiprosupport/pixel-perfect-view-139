DO $$
DECLARE
  v_user uuid := 'c9260d36-1c6d-4994-83a6-db7a3cf6c404';
  v_credit numeric := round((2.0/83.5)::numeric, 4); -- ₹2 missing
  v_new_balance numeric;
  v_new_deposited numeric;
BEGIN
  UPDATE public.wallets
  SET balance = round((balance + v_credit)::numeric, 4),
      total_deposited = round((total_deposited + v_credit)::numeric, 4)
  WHERE user_id = v_user
  RETURNING balance, total_deposited INTO v_new_balance, v_new_deposited;

  INSERT INTO public.transactions (
    user_id, type, amount, balance_after, status,
    payment_method, payment_reference, description
  ) VALUES (
    v_user, 'deposit', v_credit, v_new_balance, 'completed',
    'razorpay_auto', 'pay_SzVEOSXVGTxYWB_fee_adjust',
    'Fee/tax adjustment for pay_SzVEOSXVGTxYWB (+₹2.00 to match paid amount)'
  );
END $$;