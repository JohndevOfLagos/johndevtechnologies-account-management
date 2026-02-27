-- Fix RLS policies to allow shared visibility and editing

-- 1. Drop existing restrictive policies for Transactions
DROP POLICY IF EXISTS "Employees can read own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Employees can update own within 24h" ON public.transactions;

-- 2. Create new permissive policies for Transactions
-- Allow ALL authenticated users (Admins & Employees) to see ALL transactions
CREATE POLICY "Authenticated can read all transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);

-- Allow ALL authenticated users to update ANY transaction
CREATE POLICY "Authenticated can update any transaction" ON public.transactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. Fix Customers table policies
-- Allow ALL authenticated users to update customers (fixes Admin update issue if role check fails)
DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
CREATE POLICY "Authenticated can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
