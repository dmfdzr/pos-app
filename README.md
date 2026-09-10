# StockFlow POS

StockFlow POS adalah sistem Point of Sales (Kasir) berbasis web modern yang mendukung *multi-tenant* (banyak toko), manajemen *shift* kasir, dan dirancang dengan antarmuka pengguna yang responsif serta interaktif. Aplikasi ini dibangun di atas Next.js 14+ dan Supabase.

## Fitur Utama

### 👥 Role-based Access Control
Sistem mendukung 3 tingkat peran dengan hak akses berbeda:
- **SUPERADMIN**: Mengelola semua toko, panel admin, serta dapat memantau inventori dan laporan seluruh cabang.
- **OWNER**: Mengelola toko spesifik, karyawan (kasir), inventori toko, pengaturan (seperti pajak), dan laporan toko.
- **CASHIER**: Menjalankan transaksi di kasir (POS), mengelola *shift*, dan mencetak laporan *shift* harian.

### 🛒 Point of Sales (POS)
- Kalkulasi otomatis total belanja, diskon, dan kembalian.
- Manajemen keranjang belanja dengan sistem pencarian pintar (SKU/Nama Produk).
- Integrasi **Sistem Pajak/PPN** otomatis sesuai pengaturan toko.
- Pencetakan Struk Digital (Receipt).
- **Z-Report**: Laporan akhir shift (Total tunai vs non-tunai, perhitungan selisih saldo).

### 📦 Inventori & CRM
- Manajemen stok dan peringatan stok kritis.
- Penambahan foto/gambar produk (`image_url`) agar tampilan UI POS menjadi lebih visual.
- Database Pelanggan (CRM) untuk merekap data pelanggan (*Walk-in* vs Langganan).
- Manajemen retur barang atau **Void Transaksi** dengan pengembalian stok otomatis.

### 📊 Laporan & Analitik
- Dasbor interaktif dengan grafik pendapatan harian/bulanan.
- Log transaksi terperinci dengan filter waktu.
- Riwayat *Shift* karyawan beserta durasi dan catatan penerimaan kas.

---

## 🛠️ Teknologi yang Digunakan
- **Frontend**: Next.js (App Router), React, Tailwind CSS, Shadcn UI
- **Backend / Database**: Supabase (PostgreSQL), Edge Functions / RPCs, Row Level Security (RLS)
- **Background Worker**: Node.js + Redis
- **Deployment**: Docker, Docker Compose

---

## 🚀 Cara Menjalankan Secara Lokal

### 1. Persiapan
Pastikan Anda sudah menginstal:
- Node.js (v18 atau lebih baru)
- npm / yarn / pnpm
- Supabase CLI (untuk environment database lokal jika diperlukan)
- Docker & Docker Compose (Opsional, untuk containerization)

### 2. Instalasi
Clone repositori ini dan instal dependensi:
```bash
npm install
```

### 3. Konfigurasi Environment
Buat file `.env.local` di *root directory* dan sesuaikan kredensial Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```
*(Opsional)* Jika Anda menjalankan *background worker*, pastikan untuk menambahkan `SUPABASE_SERVICE_ROLE_KEY`.

### 4. Database Setup
Jalankan file SQL migrasi yang terdapat di dalam folder `supabase/migrations/` pada proyek Supabase Anda. Anda dapat menjalankannya melalui menu **SQL Editor** di Supabase Dashboard:
- `20240101000001_initial_schema.sql` s.d. `20240101000007_new_features.sql`.

### 5. Menjalankan Development Server
```bash
npm run dev
```
Aplikasi bisa diakses di [http://localhost:3000](http://localhost:3000).

---

## 🐳 Deployment (Docker)

Aplikasi ini sudah dipersiapkan untuk dijalankan dalam kontainer Docker. Konfigurasi `docker-compose.yml` mencakup 3 service utama: **Next.js App**, **Redis**, dan **Background Worker**.

1. **Build dan Jalankan**:
   ```bash
   docker compose up -d --build
   ```
2. Aplikasi POS akan berjalan pada port `3000`, sementara *worker* akan berjalan di belakang layar (*background*).

---

*Dikembangkan untuk memberikan kemudahan manajemen toko modern dengan antarmuka profesional dan aman.*
