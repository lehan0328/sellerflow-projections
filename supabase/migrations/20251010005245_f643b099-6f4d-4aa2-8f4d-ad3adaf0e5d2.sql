-- Create documents_metadata table to track customer and vendor associations
CREATE TABLE public.documents_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, file_path)
);

-- Enable RLS
ALTER TABLE public.documents_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own document metadata"
  ON public.documents_metadata
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document metadata"
  ON public.documents_metadata
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document metadata"
  ON public.documents_metadata
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document metadata"
  ON public.documents_metadata
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_documents_metadata_updated_at
  BEFORE UPDATE ON public.documents_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();