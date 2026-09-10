create extension if not exists "uuid-ossp";

-- 1. Master Tenant Table
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_toko VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Extended User Profiles
CREATE TYPE user_role AS ENUM ('OWNER', 'CASHIER');
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    role user_role DEFAULT 'CASHIER',
    full_name VARCHAR(255)
);

-- 3. Product Catalog
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Policy for Products" 
ON products FOR ALL 
USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation Policy for Stores" 
ON stores FOR ALL 
USING (id = (SELECT store_id FROM profiles WHERE id = auth.uid()));
