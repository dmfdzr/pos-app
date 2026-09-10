-- Add SUPERADMIN role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPERADMIN';

-- Create security definer functions to prevent infinite recursion in policies
CREATE OR REPLACE FUNCTION get_user_role() RETURNS text AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_store_id() RETURNS uuid AS $$
  SELECT store_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 1. stores
DROP POLICY IF EXISTS "Tenant Isolation Policy for Stores" ON stores;
CREATE POLICY "Tenant Isolation Policy for Stores" 
ON stores FOR ALL 
USING (
    id = get_user_store_id()
    OR 
    get_user_role() = 'SUPERADMIN'
);

-- 2. products
DROP POLICY IF EXISTS "Tenant Isolation Policy for Products" ON products;
CREATE POLICY "Tenant Isolation Policy for Products" 
ON products FOR ALL 
USING (
    store_id = get_user_store_id()
    OR 
    get_user_role() = 'SUPERADMIN'
);

-- 3. profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation Policy for Profiles" ON profiles;
CREATE POLICY "Tenant Isolation Policy for Profiles" 
ON profiles FOR ALL 
USING (
    id = auth.uid()
    OR
    store_id = get_user_store_id()
    OR 
    get_user_role() = 'SUPERADMIN'
);
