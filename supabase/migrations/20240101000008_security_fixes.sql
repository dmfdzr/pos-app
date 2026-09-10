-- ============================================================
-- MIGRASI 008: Security Fixes (Transactions & Void)
-- ============================================================

-- 1. Fix `void_transaction` Security Hole
CREATE OR REPLACE FUNCTION void_transaction(
    p_transaction_id UUID,
    p_user_id UUID,
    p_notes TEXT
) RETURNS void AS $$
DECLARE
    v_transaction RECORD;
    v_item RECORD;
    v_role TEXT;
    v_store_id UUID;
BEGIN
    -- Dapatkan role dan store_id dari caller yang sesungguhnya (auth.uid())
    v_role := get_user_role();
    v_store_id := get_user_store_id();

    -- Hanya Owner dan Superadmin yang boleh melakukan void
    IF v_role NOT IN ('SUPERADMIN', 'OWNER') THEN
        RAISE EXCEPTION 'Unauthorized: Only Owner or Superadmin can void transactions';
    END IF;

    -- Get transaction
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = p_transaction_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    -- Pastikan transaksi berasal dari toko yang sama (kecuali Superadmin)
    IF v_role != 'SUPERADMIN' AND v_transaction.store_id != v_store_id THEN
        RAISE EXCEPTION 'Unauthorized: Transaction does not belong to your store';
    END IF;

    IF v_transaction.status = 'VOID' THEN
        RAISE EXCEPTION 'Transaction is already voided';
    END IF;

    -- Mark transaction as void
    UPDATE transactions
    SET status = 'VOID',
        notes = COALESCE(v_transaction.notes, '') || ' [VOIDED: ' || p_notes || ']'
    WHERE id = p_transaction_id;

    -- Return stock and create stock movements
    FOR v_item IN
        SELECT product_id, quantity
        FROM transaction_items
        WHERE transaction_id = p_transaction_id
    LOOP
        -- Create stock movement
        INSERT INTO stock_movements (
            product_id, store_id, type, quantity_change, 
            quantity_before, quantity_after, reference_id, notes, created_by
        )
        SELECT 
            p.id, p.store_id, 'RETURN', v_item.quantity,
            p.stock_quantity, p.stock_quantity + v_item.quantity, p_transaction_id::text, p_notes, p_user_id
        FROM products p
        WHERE p.id = v_item.product_id;

        -- Update product stock
        UPDATE products
        SET stock_quantity = stock_quantity + v_item.quantity
        WHERE id = v_item.product_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Fix `process_transaction` Security & Deadlock Hole
CREATE OR REPLACE FUNCTION process_transaction(
    p_store_id UUID,
    p_cashier_id UUID,
    p_payment_method TEXT,
    p_amount_paid NUMERIC,
    p_notes TEXT,
    p_items JSON,
    p_discount_amount NUMERIC DEFAULT 0,
    p_shift_id UUID DEFAULT NULL,
    p_tax_amount NUMERIC DEFAULT 0,
    p_customer_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_total_amount NUMERIC := 0;
    v_item JSON;
    v_product RECORD;
    v_subtotal NUMERIC;
    v_change_amount NUMERIC;
    v_role TEXT;
    v_user_store_id UUID;
    v_shift_valid BOOLEAN;
BEGIN
    -- Validasi Keamanan: Pastikan caller berada di toko yang sama dengan p_store_id
    v_role := get_user_role();
    v_user_store_id := get_user_store_id();

    IF v_role != 'SUPERADMIN' AND p_store_id != v_user_store_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only create transactions for your own store';
    END IF;

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

    -- 1. Create transaction record first to get ID
    INSERT INTO transactions (
        store_id, cashier_id, payment_method, amount_paid, 
        notes, total_amount, change_amount, discount_amount, shift_id,
        tax_amount, customer_id, status
    ) VALUES (
        p_store_id, p_cashier_id, p_payment_method::payment_method, p_amount_paid, 
        p_notes, 0, 0, COALESCE(p_discount_amount, 0), p_shift_id,
        COALESCE(p_tax_amount, 0), p_customer_id, 'COMPLETED'
    ) RETURNING id INTO v_transaction_id;

    -- 2. Process each item (ORDER BY product_id untuk mencegah Deadlock pada concurrent requests)
    FOR v_item IN 
        SELECT * FROM json_array_elements(p_items) 
        ORDER BY (value->>'product_id')::UUID
    LOOP
        -- Get product info and lock row for update (PASTIKAN PRODUCT MILIK TOKO YANG SAMA)
        SELECT * INTO v_product 
        FROM products 
        WHERE id = (v_item->>'product_id')::UUID 
          AND store_id = p_store_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found or does not belong to this store', v_item->>'product_id';
        END IF;

        IF v_product.stock_quantity < (v_item->>'quantity')::NUMERIC THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_product.name;
        END IF;

        -- Calculate subtotal
        v_subtotal := v_product.price * (v_item->>'quantity')::NUMERIC;
        v_total_amount := v_total_amount + v_subtotal;

        -- Insert transaction item
        INSERT INTO transaction_items (
            transaction_id, product_id, product_name, product_sku, 
            price_at_time, quantity, subtotal
        ) VALUES (
            v_transaction_id, v_product.id, v_product.name, v_product.sku,
            v_product.price, (v_item->>'quantity')::NUMERIC, v_subtotal
        );

        -- Record stock movement (SALE)
        INSERT INTO stock_movements (
            product_id, store_id, type, quantity_change,
            quantity_before, quantity_after, reference_id, notes, created_by
        ) VALUES (
            v_product.id, p_store_id, 'SALE', -(v_item->>'quantity')::NUMERIC,
            v_product.stock_quantity, v_product.stock_quantity - (v_item->>'quantity')::NUMERIC,
            v_transaction_id::TEXT, 'Sale transaction', p_cashier_id
        );

        -- Update product stock
        UPDATE products 
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::NUMERIC
        WHERE id = v_product.id;
    END LOOP;

    -- Apply discount and tax to total (Cegah nilai minus)
    v_total_amount := GREATEST(0, v_total_amount - COALESCE(p_discount_amount, 0) + COALESCE(p_tax_amount, 0));

    -- Calculate change
    IF p_payment_method = 'TUNAI' THEN
        v_change_amount := GREATEST(0, p_amount_paid - v_total_amount);
        IF p_amount_paid < v_total_amount THEN
            RAISE EXCEPTION 'Insufficient payment amount';
        END IF;
    ELSE
        v_change_amount := 0;
        p_amount_paid := v_total_amount;
    END IF;

    -- 3. Update transaction with final totals
    UPDATE transactions 
    SET total_amount = v_total_amount,
        change_amount = v_change_amount,
        amount_paid = p_amount_paid
    WHERE id = v_transaction_id;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
