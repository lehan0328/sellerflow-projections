-- Add chart preference columns to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS chart_show_cashflow_line boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS chart_show_resources_line boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS chart_show_credit_line boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS chart_show_reserve_line boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS chart_cashflow_color text DEFAULT 'hsl(221, 83%, 53%)',
ADD COLUMN IF NOT EXISTS chart_resources_color text DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS chart_credit_color text DEFAULT '#f59e0b',
ADD COLUMN IF NOT EXISTS chart_reserve_color text DEFAULT '#ef4444';