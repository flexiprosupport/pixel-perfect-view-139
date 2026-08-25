
-- 1) profiles: field-lock trigger for non-admins
CREATE OR REPLACE FUNCTION public.profiles_lock_user_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(v_uid, 'admin'::app_role) THEN RETURN NEW; END IF;

  -- Non-admin: revert admin-controlled / immutable fields
  NEW.user_id       := OLD.user_id;
  NEW.email         := OLD.email;
  NEW.api_key       := OLD.api_key;
  NEW.is_banned     := OLD.is_banned;
  NEW.banned_at     := OLD.banned_at;
  NEW.banned_reason := OLD.banned_reason;
  NEW.created_at    := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_lock_user_columns ON public.profiles;
CREATE TRIGGER trg_profiles_lock_user_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_lock_user_columns();

-- Add WITH CHECK to the update policy so user cannot change ownership
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) bundle_items: only expose items of active bundles to the public
DROP POLICY IF EXISTS "Anyone can view bundle items" ON public.bundle_items;
CREATE POLICY "Anyone can view bundle items of active bundles" ON public.bundle_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.engagement_bundles eb
    WHERE eb.id = bundle_items.bundle_id AND eb.is_active = true
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3) chat_conversations: field-lock trigger + tightened policy
CREATE OR REPLACE FUNCTION public.chat_conversations_lock_user_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(v_uid, 'admin'::app_role) THEN RETURN NEW; END IF;

  -- Non-admin owner: cannot change ownership, contact info, or timestamps
  NEW.user_id        := OLD.user_id;
  NEW.user_email     := OLD.user_email;
  NEW.user_name      := OLD.user_name;
  NEW.created_at     := OLD.created_at;
  NEW.last_message_at:= OLD.last_message_at;

  -- Status: only allow open/closed toggles by user
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('open','closed') THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_conversations_lock_user_columns ON public.chat_conversations;
CREATE TRIGGER trg_chat_conversations_lock_user_columns
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.chat_conversations_lock_user_columns();

DROP POLICY IF EXISTS "Users update conversations" ON public.chat_conversations;
CREATE POLICY "Users update conversations" ON public.chat_conversations
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Grant EXECUTE on new trigger functions to service_role only (triggers don't need role EXECUTE)
REVOKE ALL ON FUNCTION public.profiles_lock_user_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.chat_conversations_lock_user_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.profiles_lock_user_columns() TO service_role;
GRANT EXECUTE ON FUNCTION public.chat_conversations_lock_user_columns() TO service_role;
