-- Add foreign key to allow joining transactions with profiles on user_id
-- We need to make sure profiles.user_id has a unique index (it already does from initial migration)
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_user_id_profiles_fkey;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- Ensure admins can see all transactions
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
CREATE POLICY "Admins can manage all transactions"
ON public.transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure admins can see all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
