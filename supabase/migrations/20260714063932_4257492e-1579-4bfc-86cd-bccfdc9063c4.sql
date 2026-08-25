DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_subscription();

INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
SELECT u.id, 0, 0, 0 FROM auth.users u
LEFT JOIN public.wallets w ON w.user_id = u.id WHERE w.user_id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id WHERE r.user_id IS NULL;

INSERT INTO public.subscriptions (user_id, plan_type, status)
SELECT u.id, 'none', 'inactive' FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id WHERE s.user_id IS NULL;