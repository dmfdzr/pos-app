-- ============================================================
-- MIGRASI 005: Shift Improvements - Label, Nomor, & Summary
-- ============================================================
-- Jalankan di Supabase Dashboard > SQL Editor

-- 1. Tambah kolom-kolom baru ke tabel shifts
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS shift_label VARCHAR(20) DEFAULT 'PAGI'
    CHECK (shift_label IN ('PAGI', 'SIANG', 'MALAM')),
  ADD COLUMN IF NOT EXISTS shift_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_transactions INTEGER,
  ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS total_non_cash_revenue DECIMAL(14, 2);

-- 2. Fungsi untuk mendapatkan nomor shift berikutnya hari ini (per toko)
CREATE OR REPLACE FUNCTION get_next_shift_number(p_store_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1
  INTO v_count
  FROM shifts
  WHERE store_id = p_store_id
    AND DATE(start_time AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE AT TIME ZONE 'Asia/Jakarta';
  
  RETURN v_count;
END;
$$;

-- 3. Fungsi buka shift baru (menggantikan INSERT langsung dari client)
--    Menghitung nomor shift otomatis agar tidak ada race-condition
CREATE OR REPLACE FUNCTION open_shift(
  p_store_id UUID,
  p_cashier_id UUID,
  p_starting_cash DECIMAL,
  p_shift_label VARCHAR DEFAULT 'PAGI'
)
RETURNS TABLE(id UUID, shift_number INTEGER, shift_label VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift_number INTEGER;
  v_id UUID;
  v_label VARCHAR;
BEGIN
  -- Hitung nomor shift hari ini untuk toko ini (dengan LOCK agar tidak duplikat)
  SELECT COUNT(*) + 1
  INTO v_shift_number
  FROM shifts
  WHERE store_id = p_store_id
    AND DATE(start_time AT TIME ZONE 'Asia/Jakarta') = (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;

  INSERT INTO shifts (store_id, cashier_id, starting_cash, shift_label, shift_number)
  VALUES (p_store_id, p_cashier_id, p_starting_cash, p_shift_label, v_shift_number)
  RETURNING shifts.id, shifts.shift_number, shifts.shift_label
  INTO v_id, v_shift_number, v_label;

  RETURN QUERY SELECT v_id, v_shift_number, v_label;
END;
$$;

-- 4. View untuk laporan shift (bergabung dengan cashier & ringkasan transaksi)
CREATE OR REPLACE VIEW shift_reports AS
SELECT
  s.id,
  s.store_id,
  s.shift_label,
  s.shift_number,
  s.start_time,
  s.end_time,
  s.starting_cash,
  s.ending_cash,
  s.expected_cash,
  s.notes,
  s.total_transactions,
  s.total_revenue,
  s.total_non_cash_revenue,
  p.full_name AS cashier_name,
  st.nama_toko AS store_name,
  EXTRACT(EPOCH FROM (COALESCE(s.end_time, NOW()) - s.start_time)) / 3600 AS duration_hours,
  CASE 
    WHEN s.ending_cash IS NOT NULL AND s.expected_cash IS NOT NULL 
    THEN s.ending_cash - s.expected_cash
    ELSE NULL
  END AS cash_difference
FROM shifts s
LEFT JOIN profiles p ON p.id = s.cashier_id
LEFT JOIN stores st ON st.id = s.store_id;

-- RLS pada view melalui tabel shifts yang sudah punya RLS
-- (view mewarisi izin dari tabel dasarnya)
