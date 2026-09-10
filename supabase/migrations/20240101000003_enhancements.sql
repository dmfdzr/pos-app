-- ============================================================
-- MIGRASI 003: Peningkatan POS — HPP, Diskon, Pergerakan Stok
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tambah Harga Pokok ke produk
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12, 2) DEFAULT 0 CHECK (cost_price >= 0);

-- 2. Tambah diskon ke transaksi
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);

-- 3. Tabel Pergerakan Stok (Stock Movements)
CREATE TYPE stock_movement_type AS ENUM ('SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN');

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    type stock_movement_type NOT NULL,
    quantity_change INT NOT NULL,
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for Stock Movements"
ON stock_movements FOR ALL
USING (
    store_id = get_user_store_id()
    OR get_user_role() = 'SUPERADMIN'
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store_id ON stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- 4. Update fungsi process_transaction (support diskon + catat stock movements)
CREATE OR REPLACE FUNCTION process_transaction(
    p_store_id UUID,
    p_cashier_id UUID,
    p_payment_method payment_method,
    p_amount_paid DECIMAL,
    p_notes TEXT,
    p_items JSONB,
    p_discount_amount DECIMAL DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transaction_id UUID;
    v_subtotal_total DECIMAL := 0;
    v_final_total DECIMAL;
    v_item JSONB;
    v_product products%ROWTYPE;
    v_subtotal DECIMAL;
    v_qty_before INT;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_product
        FROM products
        WHERE id = (v_item->>'product_id')::UUID
          AND store_id = p_store_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produk tidak ditemukan: %', v_item->>'product_id';
        END IF;

        IF v_product.stock_quantity < (v_item->>'quantity')::INT THEN
            RAISE EXCEPTION 'Stok tidak cukup: % (stok: %, diminta: %)',
                v_product.name, v_product.stock_quantity, (v_item->>'quantity')::INT;
        END IF;

        v_subtotal := (v_item->>'price_at_time')::DECIMAL * (v_item->>'quantity')::INT;
        v_subtotal_total := v_subtotal_total + v_subtotal;
    END LOOP;

    v_final_total := GREATEST(0, v_subtotal_total - COALESCE(p_discount_amount, 0));

    INSERT INTO transactions (store_id, cashier_id, total_amount, payment_method, amount_paid, change_amount, discount_amount, notes)
    VALUES (
        p_store_id, p_cashier_id, v_final_total, p_payment_method,
        p_amount_paid, GREATEST(0, p_amount_paid - v_final_total),
        COALESCE(p_discount_amount, 0), p_notes
    )
    RETURNING id INTO v_transaction_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID;
        v_subtotal := (v_item->>'price_at_time')::DECIMAL * (v_item->>'quantity')::INT;
        v_qty_before := v_product.stock_quantity;

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

        UPDATE products
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT
        WHERE id = (v_item->>'product_id')::UUID;

        INSERT INTO stock_movements (product_id, store_id, type, quantity_change, quantity_before, quantity_after, reference_id, created_by)
        VALUES (
            (v_item->>'product_id')::UUID, p_store_id, 'SALE',
            -((v_item->>'quantity')::INT), v_qty_before,
            v_qty_before - (v_item->>'quantity')::INT,
            v_transaction_id, p_cashier_id
        );
    END LOOP;

    RETURN v_transaction_id;
END;
$$;

-- 5. Fungsi restock_product (tambah stok manual)
CREATE OR REPLACE FUNCTION restock_product(
    p_product_id UUID,
    p_quantity INT,
    p_notes TEXT,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product products%ROWTYPE;
BEGIN
    SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak ditemukan'; END IF;
    IF p_quantity <= 0 THEN RAISE EXCEPTION 'Jumlah restock harus > 0'; END IF;

    UPDATE products SET stock_quantity = stock_quantity + p_quantity WHERE id = p_product_id;

    INSERT INTO stock_movements (product_id, store_id, type, quantity_change, quantity_before, quantity_after, notes, created_by)
    VALUES (p_product_id, v_product.store_id, 'RESTOCK', p_quantity,
            v_product.stock_quantity, v_product.stock_quantity + p_quantity, p_notes, p_user_id);
END;
$$;
