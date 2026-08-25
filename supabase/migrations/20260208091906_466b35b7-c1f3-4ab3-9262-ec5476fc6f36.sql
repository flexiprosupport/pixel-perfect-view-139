-- Add INSERT policy for users to create their own transactions
CREATE POLICY "Users can insert own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);