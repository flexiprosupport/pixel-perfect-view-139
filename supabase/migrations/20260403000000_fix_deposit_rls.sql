-- ============================================================
-- CRITICAL FIX 2.0: Robust RLS for Transactions and Storage
-- This ensures users can ALWAYS insert their own deposit requests
-- and that storage uploads never fail due to RLS.
-- ============================================================

-- 1. Ensure the transactions table has correct RLS policies
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop all potentially conflicting named policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;

-- RLS: Authenticated users can view their OWN transactions
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS: Authenticated users can insert their OWN transactions
-- This is critical for deposit requests
CREATE POLICY "Users can insert own transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS: Admins can do everything
CREATE POLICY "Admins can manage all transactions"
ON public.transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Ensure STORAGE bucket policies are bulletproof
-- Ensure the bucket exists first
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  10485760, -- 10MB (Increased for higher res photos)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old policies
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update payment proofs" ON storage.objects;

-- Storage RLS: Upload policy (Matches UID-first path pattern)
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: Read policy
CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs');

-- Storage RLS: Update/Upsert policy
CREATE POLICY "Users can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
