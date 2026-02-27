-- FORCE FIX for Customers and Transactions Permissions

-- 1. Customers Table: Allow everyone to update
DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated can update customers" ON public.customers;

CREATE POLICY "Authenticated can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. Transactions Table: Allow everyone to update (for debt clearance)
DROP POLICY IF EXISTS "Employees can update own within 24h" ON public.transactions;
DROP POLICY IF EXISTS "Employees can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated can update any transaction" ON public.transactions;

CREATE POLICY "Authenticated can update any transaction" ON public.transactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. Transactions Table: Allow everyone to see everything
DROP POLICY IF EXISTS "Employees can read own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated can read all transactions" ON public.transactions;

CREATE POLICY "Authenticated can read all transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);
