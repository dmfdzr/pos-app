-- Migration for 5 new features: Void, Tax, Customers, Product Images

-- 1. Void Transactions
ALTER TABLE transactions
ADD COLUMN status VARCHAR(20) DEFAULT 'COMPLETED';

-- Create RPC for voiding a transaction
CREATE OR REPLACE FUNCTION void_transaction(
    p_transaction_id UUID,
    p_user_id UUID,
    p_notes TEXT
) RETURNS void AS $$
DECLARE
    v_transaction RECORD;
    v_item RECORD;
BEGIN
    -- Get transaction
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = p_transaction_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
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


-- 2. Tax System (PPN)
ALTER TABLE stores
ADD COLUMN tax_rate NUMERIC(5,2) DEFAULT 0;

ALTER TABLE transactions
ADD COLUMN tax_amount NUMERIC(15,2) DEFAULT 0;


-- 3. Z-Report Print
-- No database changes needed for Z-Report (UI only).


-- 4. Customer Database (CRM)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers in their store or if superadmin"
ON customers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'SUPERADMIN' OR profiles.store_id = customers.store_id)
    )
);

CREATE POLICY "Users can insert customers in their store"
ON customers FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'SUPERADMIN' OR profiles.store_id = customers.store_id)
    )
);

CREATE POLICY "Users can update customers in their store"
ON customers FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'SUPERADMIN' OR profiles.store_id = customers.store_id)
    )
);

CREATE POLICY "Users can delete customers in their store"
ON customers FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'SUPERADMIN' OR profiles.store_id = customers.store_id)
    )
);

ALTER TABLE transactions
ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;


-- 5. Product Images
ALTER TABLE products
ADD COLUMN image_url TEXT;


-- Update process_transaction RPC to handle tax_amount and customer_id
DROP FUNCTION IF EXISTS process_transaction(uuid, uuid, text, numeric, text, json, numeric, uuid);

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
BEGIN
    -- 1. Create transaction record first to get ID
    INSERT INTO transactions (
        store_id, cashier_id, payment_method, amount_paid, 
        notes, total_amount, change_amount, discount_amount, shift_id,
        tax_amount, customer_id, status
    ) VALUES (
        p_store_id, p_cashier_id, p_payment_method::payment_method, p_amount_paid, 
        p_notes, 0, 0, p_discount_amount, p_shift_id,
        p_tax_amount, p_customer_id, 'COMPLETED'
    ) RETURNING id INTO v_transaction_id;

    -- 2. Process each item
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        -- Get product info and lock row for update
        SELECT * INTO v_product 
        FROM products 
        WHERE id = (v_item->>'product_id')::UUID 
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
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

    -- Apply discount and tax to total
    v_total_amount := v_total_amount - p_discount_amount + p_tax_amount;

    -- Calculate change
    IF p_payment_method = 'TUNAI' THEN
        v_change_amount := p_amount_paid - v_total_amount;
        IF v_change_amount < 0 THEN
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
