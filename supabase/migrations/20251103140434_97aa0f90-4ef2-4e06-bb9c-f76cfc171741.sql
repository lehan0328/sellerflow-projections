-- Add new chart preference columns for lowest projected balance line
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS chart_show_lowest_balance_line boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS chart_lowest_balance_color text DEFAULT '#ef4444';