-- Create purchase order line items table
CREATE TABLE IF NOT EXISTS public.purchase_order_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  sku TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.purchase_order_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies for line items
CREATE POLICY "Users can view their own purchase order line items"
  ON public.purchase_order_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = purchase_order_line_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own purchase order line items"
  ON public.purchase_order_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = purchase_order_line_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own purchase order line items"
  ON public.purchase_order_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = purchase_order_line_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own purchase order line items"
  ON public.purchase_order_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = purchase_order_line_items.transaction_id
      AND t.user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_po_line_items_transaction_id ON public.purchase_order_line_items(transaction_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_purchase_order_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_order_line_items_updated_at
  BEFORE UPDATE ON public.purchase_order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_purchase_order_line_items_updated_at();