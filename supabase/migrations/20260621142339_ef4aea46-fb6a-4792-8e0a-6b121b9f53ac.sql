-- 1) Cancel-order RPC: only service_role (edge function). Block direct user calls.
REVOKE EXECUTE ON FUNCTION public.cancel_order_with_refund(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;

-- 2) Internal trigger helpers: must not be callable directly.
REVOKE EXECUTE ON FUNCTION public.cancel_pending_runs_on_eo_cancel() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_pending_runs_on_item_cancel() FROM PUBLIC, anon, authenticated;

-- 3) Topup plan: admin-only function — block anon.
REVOKE EXECUTE ON FUNCTION public.get_provider_topup_plan() FROM PUBLIC, anon;

-- 4) Wallets: drop the user INSERT policy. Backend trigger handle_new_user creates the wallet at signup.
DROP POLICY IF EXISTS "Users insert own wallet" ON public.wallets;