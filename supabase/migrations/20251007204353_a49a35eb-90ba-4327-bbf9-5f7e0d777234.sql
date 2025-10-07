-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'staff');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_id)
);

-- Create team_invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, email)
);

-- Add account ownership and team info to profiles
ALTER TABLE public.profiles 
  ADD COLUMN account_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN is_account_owner BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN max_team_members INTEGER NOT NULL DEFAULT 1;

-- Update existing profiles to have their own account_id
UPDATE public.profiles SET account_id = id WHERE account_id IS NULL;

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _account_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role = _role
  );
$$;

-- Function to check if user is owner or admin
CREATE OR REPLACE FUNCTION public.is_account_admin(_user_id UUID, _account_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role IN ('owner', 'admin')
  );
$$;

-- Function to get user's account_id
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their account"
  ON public.user_roles FOR SELECT
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (is_account_admin(auth.uid(), account_id));

-- RLS Policies for team_invitations
CREATE POLICY "Users can view invitations in their account"
  ON public.team_invitations FOR SELECT
  USING (account_id = get_user_account_id(auth.uid()));

CREATE POLICY "Account admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account admins can update invitations"
  ON public.team_invitations FOR UPDATE
  USING (is_account_admin(auth.uid(), account_id));

CREATE POLICY "Account admins can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (is_account_admin(auth.uid(), account_id));

-- Trigger to create owner role on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Get the account_id from profiles
  SELECT account_id INTO v_account_id
  FROM public.profiles
  WHERE user_id = NEW.id;

  -- Create owner role for new account owner
  IF v_account_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, account_id, role)
    VALUES (NEW.id, v_account_id, 'owner');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_role_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Add indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_account_id ON public.user_roles(account_id);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_profiles_account_id ON public.profiles(account_id);