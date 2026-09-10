-- ============================================================
-- SEED 006: Reset Data & Demo Users
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================
-- ⚠️ PERINGATAN: Script ini akan MENGHAPUS SEMUA DATA yang ada!
-- Gunakan hanya untuk environment development/testing.

-- ============================================================
-- STEP 1: Hapus semua data (urutan cascade yang benar: anak dulu, baru induk)
-- ============================================================
DELETE FROM stock_movements;    -- anak dari products & profiles
DELETE FROM transaction_items;  -- anak dari transactions
DELETE FROM transactions;       -- anak dari shifts, stores, profiles
DELETE FROM shifts;             -- anak dari stores & profiles
DELETE FROM products;           -- anak dari stores
DELETE FROM stores;             -- root

-- Hapus demo users lama jika ada
DELETE FROM auth.users WHERE email IN (
  'superadmin@demo.com',
  'owner@demo.com',
  'kasir@demo.com'
);

-- ============================================================
-- STEP 2: Buat 3 Auth Users (via auth.users langsung)
-- ============================================================
-- SUPERADMIN: superadmin@demo.com / super123
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'superadmin@demo.com',
  crypt('super123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Super Admin"}',
  NOW(), NOW(), '', '', '', ''
);

-- OWNER: owner@demo.com / owner123
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'owner@demo.com',
  crypt('owner123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Owner Demo"}',
  NOW(), NOW(), '', '', '', ''
);

-- KASIR: kasir@demo.com / kasir123
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'kasir@demo.com',
  crypt('kasir123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Kasir Demo"}',
  NOW(), NOW(), '', '', '', ''
);

-- ============================================================
-- STEP 3: Buat identitas login (auth.identities)
-- ============================================================
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'superadmin@demo.com', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"superadmin@demo.com"}',
   'email', NOW(), NOW(), NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'owner@demo.com', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","email":"owner@demo.com"}',
   'email', NOW(), NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'kasir@demo.com', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","email":"kasir@demo.com"}',
   'email', NOW(), NOW(), NOW());

-- ============================================================
-- STEP 4: Buat 1 Toko Demo
-- ============================================================
INSERT INTO stores (id, nama_toko, alamat, telepon)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'Toko Serenity Demo',
  'Jl. Merdeka No. 1, Jakarta',
  '08123456789'
);

-- ============================================================
-- STEP 5: Buat Profiles (terhubung ke auth.users)
-- ============================================================
INSERT INTO profiles (id, full_name, role, store_id) VALUES
  -- SUPERADMIN: tidak punya store (bisa akses semua)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Super Admin', 'SUPERADMIN', NULL),
  -- OWNER: terhubung ke Toko Demo
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Owner Demo', 'OWNER', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  -- KASIR: terhubung ke Toko Demo
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Kasir Demo', 'CASHIER', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- ============================================================
-- STEP 6: Tambah beberapa produk demo
-- ============================================================
INSERT INTO products (name, sku, kategori, price, cost_price, stock_quantity, store_id) VALUES
  ('Aqua 600ml', 'AQ600', 'Minuman', 3500, 2500, 100, 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('Indomie Goreng', 'IMG01', 'Makanan', 3500, 2700, 200, 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('Pocari Sweat 350ml', 'PCS350', 'Minuman', 8000, 6000, 50, 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('Chitato 68gr', 'CHT68', 'Snack', 10000, 7500, 75, 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('Teh Pucuk 350ml', 'TP350', 'Minuman', 4000, 3000, 3, 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('Milo 200ml', 'ML200', 'Minuman', 5000, 3500, 60, 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- ============================================================
-- SELESAI! Ringkasan akun demo:
-- ============================================================
-- 🔴 SUPERADMIN : superadmin@demo.com  / super123
-- 🟡 OWNER      : owner@demo.com       / owner123
-- 🟢 KASIR      : kasir@demo.com       / kasir123
-- 🏪 Toko       : Toko Serenity Demo
