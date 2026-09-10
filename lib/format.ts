/**
 * Format angka menjadi format mata uang Rupiah Indonesia
 * Contoh: 150000 → "Rp 150.000"
 * Contoh: 150000.5 → "Rp 150.000,50"
 */
export function formatRupiah(amount: number, showDecimal = false): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: showDecimal ? 2 : 0,
    maximumFractionDigits: showDecimal ? 2 : 0,
  }).format(amount)
}

/**
 * Parse string Rupiah kembali ke angka
 * Contoh: "Rp 150.000" → 150000
 */
export function parseRupiah(value: string): number {
  return Number(value.replace(/[^0-9,-]/g, '').replace(',', '.'))
}
