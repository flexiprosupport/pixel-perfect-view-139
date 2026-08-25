
-- 1. Fix: Add INSERT policy on wallets so users can only create their own wallet
CREATE POLICY "Users insert own wallet"
ON public.wallets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Fix: Make deposit-screenshots bucket private
UPDATE storage.buckets SET public = false WHERE id = 'deposit-screenshots';

-- 3. Fix storage RLS: Drop overly permissive policies and add proper ones
DROP POLICY IF EXISTS "Allow public read deposit-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read deposit-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload deposit-screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view deposit screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload deposit screenshots" ON storage.objects;

-- Users can only read their own screenshots (path starts with their user_id)
CREATE POLICY "Users read own deposit screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'deposit-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can read all screenshots
CREATE POLICY "Admins read all deposit screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'deposit-screenshots' AND public.has_role(auth.uid(), 'admin'));

-- Users can upload to their own folder only
CREATE POLICY "Users upload own deposit screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deposit-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
