-- Replace blanket admin write access with view-only.
DROP POLICY IF EXISTS "Admins manage wallets" ON public.wallets;
CREATE POLICY "Admins view all wallets"
  ON public.wallets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage transactions" ON public.transactions;
CREATE POLICY "Admins view all transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));