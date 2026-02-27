-- Fix RLS to allow Admins to delete requests when deleting a customer
-- This fixes the "violate foreign key constraint" error

-- 1. Allow Admins to delete from debt_clearance_requests
DROP POLICY IF EXISTS "Admins can delete debt clearance requests" ON public.debt_clearance_requests;
CREATE POLICY "Admins can delete debt clearance requests" ON public.debt_clearance_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Allow Admins to delete from deletion_requests (for completeness)
DROP POLICY IF EXISTS "Admins can delete deletion requests" ON public.deletion_requests;
CREATE POLICY "Admins can delete deletion requests" ON public.deletion_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
