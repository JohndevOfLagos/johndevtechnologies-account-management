-- Create role enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create customer type enum
DO $$ BEGIN
    CREATE TYPE public.customer_type AS ENUM ('vip', 'regular', 'normal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payment status enum
DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM ('paid', 'unpaid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  customer_type customer_type NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  employee_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC,
  payment_status payment_status NOT NULL DEFAULT 'paid',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id),
  edited_by UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Enable realtime for transactions
-- Note: 'supabase_realtime' publication usually exists by default in Supabase.
-- We check if the table is already in the publication before adding it to avoid errors, 
-- or simply ignore duplicate errors if feasible. For SQL script simplicity, we'll try adding it 
-- and catch potential errors if needed, but standard 'ALTER PUBLICATION ... ADD TABLE' 
-- might fail if it's already there depending on Postgres version.
-- A safer way in scripts:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  END IF;
END
$$;


-- Seed services
INSERT INTO public.services (name) VALUES
  ('Charging Station'),
  ('Accessories'),
  ('POS Agent'),
  ('Snooker Spot'),
  ('Repairs'),
  ('Device Sales')
ON CONFLICT (name) DO NOTHING;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

-- Drop trigger if exists to avoid error on creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
-- Helper to drop policy if exists
DO $$
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Anyone authenticated can read profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    
    -- User roles
    DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

    -- Customers
    DROP POLICY IF EXISTS "Authenticated can read customers" ON public.customers;
    DROP POLICY IF EXISTS "Authenticated can insert customers" ON public.customers;
    DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
    DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;

    -- Services
    DROP POLICY IF EXISTS "Authenticated can read services" ON public.services;

    -- Transactions
    DROP POLICY IF EXISTS "Employees can read own transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Authenticated can insert transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Employees can update own within 24h" ON public.transactions;
    DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;

    -- Audit logs
    DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
END
$$;

-- Profiles: users can read all profiles, update own
CREATE POLICY "Anyone authenticated can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles: admins can manage, users can read own
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Customers: authenticated can read, admins can manage
CREATE POLICY "Authenticated can read customers" ON public.customers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Services: all authenticated can read
CREATE POLICY "Authenticated can read services" ON public.services
  FOR SELECT TO authenticated USING (true);

-- Transactions: employees see own, admins see all
CREATE POLICY "Employees can read own transactions" ON public.transactions
  FOR SELECT TO authenticated USING (employee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Employees can update own within 24h" ON public.transactions
  FOR UPDATE TO authenticated USING (
    (employee_id = auth.uid() AND created_at > now() - interval '24 hours')
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins can delete transactions" ON public.transactions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs: admins only
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (edited_by = auth.uid());
