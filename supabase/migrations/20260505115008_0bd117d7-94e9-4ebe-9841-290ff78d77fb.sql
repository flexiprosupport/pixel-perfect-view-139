-- Wallet INSERT policy
CREATE POLICY "Users insert own wallet"
ON public.wallets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Deposit screenshots: UPDATE/DELETE protections
CREATE POLICY "Users update own deposit screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'deposit-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'deposit-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own deposit screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'deposit-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins manage deposit screenshots"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'deposit-screenshots' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'deposit-screenshots' AND has_role(auth.uid(), 'admin'::app_role));