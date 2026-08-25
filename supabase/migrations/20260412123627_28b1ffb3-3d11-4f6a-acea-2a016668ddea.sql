UPDATE public.services
SET min_quantity = 100,
    updated_at = now()
WHERE id = '68644f22-2f40-4888-90e6-86ed9285dceb'
  AND min_quantity <> 100;