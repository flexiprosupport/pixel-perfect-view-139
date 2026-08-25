-- Make alexchep primary and disable cheapxbhi for Instagram Saves
UPDATE public.service_provider_mapping
SET sort_order = 1
WHERE service_id = '0d66e261-eeed-44e5-97e7-21e3dc6a20a1'
  AND provider_account_id = '75fae6f6-84cc-49d0-a485-39b401fb3159'; -- alexchep

UPDATE public.service_provider_mapping
SET is_active = false
WHERE service_id = '0d66e261-eeed-44e5-97e7-21e3dc6a20a1'
  AND provider_account_id = '226af5dc-1a87-4cdb-bf52-a33c4d1de8e7'; -- cheapxbhi (not delivering)
