DROP POLICY IF EXISTS "Users read own ticket proofs" ON storage.objects;
CREATE POLICY "Users read own ticket proofs" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-proofs'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'::app_role))
);