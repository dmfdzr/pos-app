-- ============================================================
-- MIGRASI 004: Shift Management & Multi-Tenant Superadmin
-- ============================================================

-- 1. Mengubah store_id menjadi opsional (nullable) untuk Superadmin
ALTER TABLE profiles ALTER COLUMN store_id DROP NOT NULL;

-- Memastikan CASHIER dan OWNER tetap harus punya store_id, tapi SUPERADMIN bebas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_store_id_check'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_store_id_check
        CHECK (
            role = 'SUPERADMIN' OR store_id IS NOT NULL
        );
    END IF;
END $$;


-- 2. Membuat tabel Shifts (Shift Management)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES profiles(id),
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ, -- Jika NULL, artinya shift masih berjalan
    starting_cash DECIMAL(14, 2) NOT NULL CHECK (starting_cash >= 0),
    ending_cash DECIMAL(14, 2) CHECK (ending_cash >= 0),
    expected_cash DECIMAL(14, 2) CHECK (expected_cash >= 0),
    notes TEXT
);

-- Hanya satu shift aktif per kasir (per toko)
CREATE UNIQUE INDEX IF NOT EXISTS active_shift_idx 
ON shifts (cashier_id, store_id) 
WHERE end_time IS NULL;

-- RLS untuk tabel Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation for Shifts"
ON shifts FOR ALL
USING (
    store_id = get_user_store_id()
    OR get_user_role() = 'SUPERADMIN'
);

CREATE INDEX IF NOT EXISTS idx_shifts_store_id ON shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier_id ON shifts(cashier_id);


-- 3. Mengaitkan Transaksi dengan Shift
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON transactions(shift_id);


-- 4. Update Fungsi process_transaction
-- Menambahkan parameter p_shift_id dan memastikan shift tersebut valid
CREATE OR REPLACE FUNCTION process_transaction(
    p_store_id UUID,
    p_cashier_id UUID,
    p_payment_method payment_method,
    p_amount_paid DECIMAL,
    p_notes TEXT,
    p_items JSONB,  -- Array: [{product_id, quantity, price_at_time}]
    p_discount_amount DECIMAL DEFAULT 0,
    p_shift_id UUID DEFAULT NULL
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
    v_shift_valid BOOLEAN;
BEGIN
    -- Jika p_shift_id diberikan, validasi bahwa shift sedang aktif dan milik kasir ini
    IF p_shift_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM shifts 
            WHERE id = p_shift_id 
              AND cashier_id = p_cashier_id 
              AND store_id = p_store_id
              AND end_time IS NULL
        ) INTO v_shift_valid;

        IF NOT v_shift_valid THEN
            RAISE EXCEPTION 'Shift tidak valid atau sudah ditutup.';
        END IF;
    END IF;

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
    
    -- Kurangi dengan diskon
    v_total := GREATEST(0, v_total - p_discount_amount);

    -- Buat record transaksi
    INSERT INTO transactions (store_id, cashier_id, total_amount, payment_method, amount_paid, change_amount, notes, discount_amount, shift_id)
    VALUES (
        p_store_id, p_cashier_id, v_total, p_payment_method,
        p_amount_paid, GREATEST(0, p_amount_paid - v_total), p_notes, p_discount_amount, p_shift_id
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
