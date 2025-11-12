-- Create custom discount codes table for admin-managed codes
CREATE TABLE IF NOT EXISTS public.custom_discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  duration_months INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_discount_codes ENABLE ROW LEVEL SECURITY;

-- Admin policy to manage custom codes
CREATE POLICY "Admins can manage custom discount codes"
ON public.custom_discount_codes
FOR ALL
USING (is_website_admin() OR has_admin_role(auth.uid()))
WITH CHECK (is_website_admin() OR has_admin_role(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_custom_discount_codes_code ON public.custom_discount_codes(code);
CREATE INDEX idx_custom_discount_codes_active ON public.custom_discount_codes(is_active) WHERE is_active = true;

-- Update timestamp trigger
CREATE TRIGGER update_custom_discount_codes_updated_at
  BEFORE UPDATE ON public.custom_discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();