-- Fix search_path by recreating the function properly
DROP TRIGGER IF EXISTS update_purchase_order_line_items_updated_at ON public.purchase_order_line_items;
DROP FUNCTION IF EXISTS public.update_purchase_order_line_items_updated_at();

CREATE OR REPLACE FUNCTION public.update_purchase_order_line_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_purchase_order_line_items_updated_at
  BEFORE UPDATE ON public.purchase_order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_purchase_order_line_items_updated_at();