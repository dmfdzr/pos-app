-- ============================================================
-- MIGRASI 002: Transaksi, Kategori, Detail Toko, Fix SKU
-- Jalankan SETELAH 20240101000001_superadmin.sql
-- ============================================================

-- 1. Tambah kolom detail ke tabel stores
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS telepon VARCHAR(20),
  ADD COLUMN IF NOT EXISTS npwp VARCHAR(30),
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Tambah kolom kategori ke products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS kategori VARCHAR(100);

-- 3. Fix SKU UNIQUE constraint: dari global menjadi per-toko
--    (hapus constraint lama jika ada, buat yang baru)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_store_unique 
  ON products(sku, store_id) 
  WHERE sku IS NOT NULL;

-- 4. Tabel Transaksi (header)
CREATE TYPE payment_method AS ENUM ('TUNAI', 'QRIS', 'TRANSFER_BANK', 'KARTU_DEBIT', 'KARTU_KREDIT');

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES profiles(id),
    total_amount DECIMAL(14, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method payment_method NOT NULL DEFAULT 'TUNAI',
    amount_paid DECIMAL(14, 2),           -- Nominal yang dibayar (untuk hitung kembalian tunai)
    change_amount DECIMAL(14, 2),         -- Kembalian
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Detail Transaksi (item)
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,   -- Snapshot nama produk saat transaksi
    product_sku VARCHAR(100),             -- Snapshot SKU
    price_at_time DECIMAL(12, 2) NOT NULL,-- Snapshot harga saat transaksi
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(14, 2) NOT NULL
);

-- 6. Fungsi process_transaction() dengan row-level locking
--    Menghindari race-condition stok di lingkungan concurrent
CREATE OR REPLACE FUNCTION process_transaction(
    p_store_id UUID,
    p_cashier_id UUID,
    p_payment_method payment_method,
    p_amount_paid DECIMAL,
    p_notes TEXT,
    p_items JSONB  -- Array: [{product_id, quantity, price_at_time}]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transaction_id UUID;
    v_total DECIMAL := 0;
    v_item JSONB;
    v_product products%ROWTYPE;
    v_subtotal DECIMAL;
BEGIN
    -- Validasi: lock semua produk yang terlibat agar tidak ada race-condition
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_product
        FROM products
        WHERE id = (v_item->>'product_id')::UUID
          AND store_id = p_store_id
        FOR UPDATE;  -- Row-level lock

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produk tidak ditemukan atau bukan milik toko ini: %', v_item->>'product_id';
        END IF;

        IF v_product.stock_quantity < (v_item->>'quantity')::INT THEN
            RAISE EXCEPTION 'Stok tidak cukup untuk produk: % (stok: %, diminta: %)',
                v_product.name, v_product.stock_quantity, (v_item->>'quantity')::INT;
        END IF;

        v_subtotal := (v_item->>'price_at_time')::DECIMAL * (v_item->>'quantity')::INT;
        v_total := v_total + v_subtotal;
    END LOOP;

    -- Buat record transaksi
    INSERT INTO transactions (store_id, cashier_id, total_amount, payment_method, amount_paid, change_amount, notes)
    VALUES (
        p_store_id, p_cashier_id, v_total, p_payment_method,
        p_amount_paid, GREATEST(0, p_amount_paid - v_total), p_notes
    )
    RETURNING id INTO v_transaction_id;

    -- Buat item transaksi & kurangi stok
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID;
        v_subtotal := (v_item->>'price_at_time')::DECIMAL * (v_item->>'quantity')::INT;

        INSERT INTO transaction_items (transaction_id, product_id, product_name, product_sku, price_at_time, quantity, subtotal)
        VALUES (
            v_transaction_id,
            (v_item->>'product_id')::UUID,
            v_product.name,
            v_product.sku,
            (v_item->>'price_at_time')::DECIMAL,
            (v_item->>'quantity')::INT,
            v_subtotal
        );

        -- Kurangi stok
        UPDATE products
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT
        WHERE id = (v_item->>'product_id')::UUID;
    END LOOP;

    RETURN v_transaction_id;
END;
$$;

-- 7. RLS untuk tabel baru
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for Transactions"
ON transactions FOR ALL
USING (
    store_id = get_user_store_id()
    OR get_user_role() = 'SUPERADMIN'
);

ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for Transaction Items"
ON transaction_items FOR ALL
USING (
    transaction_id IN (
        SELECT id FROM transactions WHERE store_id = get_user_store_id()
    )
    OR get_user_role() = 'SUPERADMIN'
);

-- 8. Index performa
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
