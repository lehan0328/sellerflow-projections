-- Add admin role for chuandy914@gmail.com
INSERT INTO public.user_roles (user_id, account_id, role)
VALUES (
  '514bb5ae-8645-4e4f-94bd-8701a156a8ee', 
  '54ca6953-5f8b-4104-b5bc-470b30c2b6f3', 
  'admin'::app_role
)
ON CONFLICT (user_id, account_id) DO UPDATE
SET role = 'admin'::app_role;