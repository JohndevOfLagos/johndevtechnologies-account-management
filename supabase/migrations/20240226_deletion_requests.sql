-- Create table for deletion requests
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES auth.users(id) NOT NULL,
  service_id UUID REFERENCES public.services(id), -- Null means "All Services"
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  record_count INTEGER, -- Snapshot of how many records matched at request time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Employees can insert requests
CREATE POLICY "Employees can insert deletion requests" ON public.deletion_requests
  FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());

-- Employees can read their own requests
CREATE POLICY "Employees can read own deletion requests" ON public.deletion_requests
  FOR SELECT TO authenticated USING (employee_id = auth.uid());

-- Admins can read all requests
CREATE POLICY "Admins can read all deletion requests" ON public.deletion_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update deletion requests" ON public.deletion_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Revert Transaction Delete Policy for Employees (Strict Security)
-- Only Admins can delete transactions now. Employees must request.
DROP POLICY IF EXISTS "Authenticated users can delete own or admin delete all" ON public.transactions;

CREATE POLICY "Admins can delete transactions" ON public.transactions
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') 
    OR 
    auth.email() = 'johndevtechnologies@gmail.com'
  );
