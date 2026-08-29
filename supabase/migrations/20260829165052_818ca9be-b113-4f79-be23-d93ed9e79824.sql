INSERT INTO public.providers (id, name, api_url, api_key, is_active)
SELECT DISTINCT ON (pa.provider_id) pa.provider_id, pa.provider_id, pa.api_url, pa.api_key, true
FROM public.provider_accounts pa
WHERE pa.is_active = true
ORDER BY pa.provider_id, pa.priority ASC
ON CONFLICT (id) DO NOTHING;