-- Add kevin@imarand.com to chuandy914@gmail.com's account for document access
-- Kevin's user_id: 8ecf98e9-e833-435d-9967-c711bed5c3d0
-- Andy's account_id: 54ca6953-5f8b-4104-b5bc-470b30c2b6f3

-- Add Kevin to Andy's account with admin role
-- First, check if Kevin already has ANY role in Andy's account and delete it
DELETE FROM public.user_roles 
WHERE user_id = '8ecf98e9-e833-435d-9967-c711bed5c3d0' 
  AND account_id = '54ca6953-5f8b-4104-b5bc-470b30c2b6f3';

-- Then add Kevin with admin role
INSERT INTO public.user_roles (user_id, account_id, role)
VALUES (
  '8ecf98e9-e833-435d-9967-c711bed5c3d0', -- Kevin's user_id
  '54ca6953-5f8b-4104-b5bc-470b30c2b6f3', -- Andy's account_id
  'admin'
);