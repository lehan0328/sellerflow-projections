-- Create table to store monthly support metrics snapshots
CREATE TABLE IF NOT EXISTS public.monthly_support_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  cases_opened INTEGER NOT NULL DEFAULT 0,
  cases_closed INTEGER NOT NULL DEFAULT 0,
  avg_resolution_days NUMERIC(10,2) DEFAULT 0,
  first_response_hours NUMERIC(10,2) DEFAULT 0,
  avg_response_hours NUMERIC(10,2) DEFAULT 0,
  sla_within_4_hours INTEGER DEFAULT 0,
  sla_within_24_hours INTEGER DEFAULT 0,
  response_time_by_priority JSONB DEFAULT '[]'::jsonb,
  response_time_by_category JSONB DEFAULT '[]'::jsonb,
  cases_by_category JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(month_year)
);

-- Enable RLS
ALTER TABLE public.monthly_support_metrics ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all metrics
CREATE POLICY "Admins can view monthly support metrics"
  ON public.monthly_support_metrics
  FOR SELECT
  USING (is_website_admin() OR has_admin_role(auth.uid()));

-- Allow system to insert metrics
CREATE POLICY "System can insert monthly support metrics"
  ON public.monthly_support_metrics
  FOR INSERT
  WITH CHECK (true);

-- Create index for efficient lookups
CREATE INDEX idx_monthly_support_metrics_month ON public.monthly_support_metrics(month_year);

COMMENT ON TABLE public.monthly_support_metrics IS 'Stores monthly snapshots of support ticket metrics for historical tracking and month-over-month comparison';