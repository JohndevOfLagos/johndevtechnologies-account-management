-- Create table for debt clearance requests
CREATE TABLE IF NOT EXISTS public.debt_clearance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debt_clearance_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can read requests (or just admins? employees might want to see their own)
CREATE POLICY "Authenticated can read requests" ON public.debt_clearance_requests
  FOR SELECT TO authenticated USING (true);

-- Authenticated can insert requests
CREATE POLICY "Authenticated can insert requests" ON public.debt_clearance_requests
  FOR INSERT TO authenticated WITH CHECK (true);

-- Only Admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests" ON public.debt_clearance_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'debt_clearance_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debt_clearance_requests;
  END IF;
END
$$;
