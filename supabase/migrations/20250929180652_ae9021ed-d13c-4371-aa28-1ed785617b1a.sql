-- Drop the secure_bank_accounts view as it creates a security definer vulnerability
-- Applications should query the bank_accounts table directly which has proper RLS policies
DROP VIEW IF EXISTS public.secure_bank_accounts;