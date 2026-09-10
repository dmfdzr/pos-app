-- ============================================================
-- MIGRASI 009: Master Kategori Produk (ganti string bebas -> FK)
-- ============================================================

-- 1. Tabel master kategori per toko
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT categories_name_not_empty CHECK (char_length(trim(name)) > 0)
);

-- Unique per toko, case-insensitive (mencegah "Minuman" vs "minuman")
CREATE UNIQUE INDEX IF NOT EXISTS categories_store_name_unique
ON categories (store_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);

-- RLS: isolasi tenant, SUPERADMIN bisa semua
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Categories" ON categories;
CREATE POLICY "Tenant Isolation for Categories"
ON categories FOR ALL
USING (
    store_id = get_user_store_id()
    OR get_user_role() = 'SUPERADMIN'
);

-- 2. Tambah FK di products (jangan hapus kolom kategori lama dulu untuk backward-compat)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- 3. Migrasi data existing: string kategori -> baris categories + isi category_id
--    Insert kategori unik per toko
INSERT INTO categories (store_id, name)
SELECT DISTINCT store_id, trim(kategori)
FROM products
WHERE kategori IS NOT NULL AND trim(kategori) <> ''
ON CONFLICT DO NOTHING;

--    Isi category_id berdasarkan kecocokan nama (case-insensitive)
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE c.store_id = p.store_id
  AND lower(c.name) = lower(trim(p.kategori))
  AND p.category_id IS NULL
  AND p.kategori IS NOT NULL;

-- 4. Helper: sinkronisasi kategori string saat insert/update via trigger (opsional, jaga konsistensi)
--    Jika category_id diisi, otomatis isi kolom kategori dengan nama kategori
CREATE OR REPLACE FUNCTION sync_product_category_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category_id IS NOT NULL THEN
        SELECT name INTO NEW.kategori FROM categories WHERE id = NEW.category_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_category ON products;
CREATE TRIGGER trg_sync_product_category
BEFORE INSERT OR UPDATE OF category_id ON products
FOR EACH ROW EXECUTE FUNCTION sync_product_category_name();
