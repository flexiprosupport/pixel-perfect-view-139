CREATE POLICY "Users create own deposit transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND type = 'deposit' AND status = 'pending');