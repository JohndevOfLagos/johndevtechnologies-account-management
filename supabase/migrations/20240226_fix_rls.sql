-- Fix RLS policies to allow shared visibility and editing

-- 1. Drop existing restrictive policies for Transactions
DROP POLICY IF EXISTS "Employees can read own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Employees can update own within 24h" ON public.transactions;

-- 2. Create new permissive policies
-- Allow ALL authenticated users (Admins & Employees) to see ALL transactions
CREATE POLICY "Authenticated can read all transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);

-- Allow ALL authenticated users to update ANY transaction
-- This is required so employees can mark transactions as "paid" (clear debt)
-- even if they didn't create the record or if it's older than 24h.
CREATE POLICY "Authenticated can update any transaction" ON public.transactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
