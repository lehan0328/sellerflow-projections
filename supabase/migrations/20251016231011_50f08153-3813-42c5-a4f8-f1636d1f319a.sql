-- Create table to track purchased add-ons
CREATE TABLE IF NOT EXISTS public.purchased_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  addon_type TEXT NOT NULL CHECK (addon_type IN ('bank_connection', 'amazon_connection')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_paid NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.purchased_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Account members can view their purchased addons"
  ON public.purchased_addons
  FOR SELECT
  USING (user_belongs_to_account(account_id));

CREATE POLICY "Account members can create purchased addons"
  ON public.purchased_addons
  FOR INSERT
  WITH CHECK (user_belongs_to_account(account_id));

-- Create index for faster queries
CREATE INDEX idx_purchased_addons_user_account ON public.purchased_addons(user_id, account_id);
CREATE INDEX idx_purchased_addons_type ON public.purchased_addons(addon_type);

-- Add trigger for updated_at
CREATE TRIGGER update_purchased_addons_updated_at
  BEFORE UPDATE ON public.purchased_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();