'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Database } from '@/types/database'
import { useCart } from '@/hooks/use-cart'
import { formatRupiah } from '@/lib/format'
import { ReceiptDialog, type PaymentMethod, type ReceiptData } from '@/components/receipt-dialog'
import { OpenShiftDialog, CloseShiftDialog, type ShiftData } from '@/components/shift-dialog'
import { ZReportDialog, type ZReportData } from '@/components/z-report-dialog'
import { ShoppingCart, Trash2, Tag, Sun, Sunset, Moon, Wallet, Clock, AlertTriangle } from 'lucide-react'
import { useDictionary } from '@/lib/i18n/use-dictionary'

type Product = Database['public']['Tables']['products']['Row']
type ReceiptState = ReceiptData | null

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'TUNAI', label: '💵 Tunai' },
  { value: 'QRIS', label: '📱 QRIS' },
  { value: 'TRANSFER_BANK', label: '🏦 Transfer Bank' },
  { value: 'KARTU_DEBIT', label: '💳 Kartu Debit' },
  { value: 'KARTU_KREDIT', label: '💳 Kartu Kredit' },
]

export default function POSPage() {
  const supabase = createClient()
  const dict = useDictionary()
  const { items, addItem, updateQuantity, removeItem, clearCart, total } = useCart()

  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI')
  const [amountPaid, setAmountPaid] = useState('')
  const [discount, setDiscount] = useState('')
  const [customerId, setCustomerId] = useState<string>('walk-in')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ReceiptState>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [zReportData, setZReportData] = useState<ZReportData | null>(null)
  
  // Shift state
  const [storeId, setStoreId] = useState<string>('')
  const [taxRate, setTaxRate] = useState<number>(0)
  const [cashierId, setCashierId] = useState<string>('')
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null)
  const [openShiftDialogOpen, setOpenShiftDialogOpen] = useState(false)
  const [closeShiftOpen, setCloseShiftOpen] = useState(false)
  const [isCheckingShift, setIsCheckingShift] = useState(true)
  const [shiftStats, setShiftStats] = useState({ cashSales: 0, totalTransactions: 0, totalRevenue: 0, totalNonCash: 0 })

  // Offline capability state
  type OfflinePayload = {
    p_store_id: string
    p_cashier_id: string
    p_payment_method: PaymentMethod
    p_amount_paid: number
    p_notes: string | null
    p_items: { product_id: string; quantity: number; price_at_time: number }[]
    p_discount_amount: number
    p_shift_id: string | undefined
    p_tax_amount: number
    p_customer_id: string | null
  }
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [offlineQueue, setOfflineQueue] = useState<{
    id: string
    timestamp: number
    payload: OfflinePayload
  }[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('pos_offline_queue')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return
    setLoading(true)
    let successful = 0

    for (const item of offlineQueue) {
      try {
        const { error } = await supabase.rpc('process_transaction', item.payload)
        if (!error) {
          successful++
        }
      } catch (err) {
        console.error('Failed to sync transaction', err)
      }
    }

    if (successful > 0) {
      const remaining = offlineQueue.slice(successful)
      setOfflineQueue(remaining)
      localStorage.setItem('pos_offline_queue', JSON.stringify(remaining))
      alert(`Berhasil sinkronisasi ${successful} transaksi offline!`)
      mutate()
    }
    setLoading(false)
  }

  useEffect(() => {
    const checkShift = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: profile } = await supabase.from('profiles').select('store_id, stores(tax_rate)').eq('id', user.id).single()
      if (profile?.store_id) {
        setStoreId(profile.store_id)
        setCashierId(user.id)
        // @ts-expect-error stores is joined object
        if (profile.stores?.tax_rate) setTaxRate(Number(profile.stores.tax_rate))
        
        // Check active shift
        const { data: shift } = await supabase
          .from('shifts')
          .select('id, shift_label, shift_number, starting_cash, start_time')
          .eq('cashier_id', user.id)
          .eq('store_id', profile.store_id)
          .is('end_time', null)
          .maybeSingle()
          
        if (shift) {
          setActiveShift({
            id: shift.id,
            shift_label: (shift.shift_label as ShiftData['shift_label']) || 'PAGI',
            shift_number: shift.shift_number || 1,
            starting_cash: Number(shift.starting_cash),
            start_time: shift.start_time,
          })
        }
      }
      setIsCheckingShift(false)
    }
    checkShift()
  }, [supabase])

  const fetcher = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name')
    if (error) throw error
    return data as Product[]
  }

  const { data: products, mutate } = useSWR('products', fetcher)

  // Fetch customers
  const fetchCustomers = async () => {
    if (!storeId) return []
    const { data, error } = await supabase.from('customers').select('id, name, phone').eq('store_id', storeId).order('name')
    if (error) throw error
    return data
  }
  const { data: customers } = useSWR(storeId ? `customers-${storeId}` : null, fetchCustomers)

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.kategori?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const discountAmount = Math.min(Number(discount) || 0, total)
  const subtotalAfterDiscount = Math.max(0, total - discountAmount)
  const taxAmount = (subtotalAfterDiscount * taxRate) / 100
  const finalTotal = subtotalAfterDiscount + taxAmount
  const change = paymentMethod === 'TUNAI' ? Math.max(0, Number(amountPaid) - finalTotal) : 0

  // Check if an item in cart exceeds available stock
  const getStockWarning = (productId: string) => {
    const product = products?.find(p => p.id === productId)
    const cartItem = items.find(i => i.product_id === productId)
    if (!product || !cartItem) return false
    return cartItem.quantity > product.stock_quantity
  }

  const hasStockWarning = items.some(item => getStockWarning(item.product_id))

  const handleCheckout = useCallback(async () => {
    if (items.length === 0) return
    if (!activeShift) {
      setError('Silakan pilih atau buka shift terlebih dahulu sebelum melakukan transaksi.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Anda harus login terlebih dahulu')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, store:stores(nama_toko)')
        .eq('id', userData.user.id)
        .single()

      if (!profile) throw new Error('Profil kasir tidak ditemukan')

      const paidAmount = paymentMethod === 'TUNAI' ? Number(amountPaid) : finalTotal
      if (paymentMethod === 'TUNAI' && paidAmount < finalTotal) {
        throw new Error(`${dict.pos.notEnoughMoney} ${formatRupiah(finalTotal - paidAmount)}`)
      }

      const payload = {
        p_store_id: profile.store_id!,
        p_cashier_id: userData.user.id,
        p_payment_method: paymentMethod,
        p_amount_paid: paidAmount,
        p_notes: null,
        p_items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          price_at_time: i.price,
        })),
        p_discount_amount: discountAmount,
        p_shift_id: activeShift?.id,
        p_tax_amount: taxAmount,
        p_customer_id: customerId !== 'walk-in' ? customerId : null
      }

      // If offline, queue transaction locally
      if (isOffline || !navigator.onLine) {
        const queueItem = { id: crypto.randomUUID(), timestamp: Date.now(), payload }
        const newQueue = [...offlineQueue, queueItem]
        setOfflineQueue(newQueue)
        localStorage.setItem('pos_offline_queue', JSON.stringify(newQueue))
        setReceipt({
          transactionId: queueItem.id,
          storeName: profile.store?.nama_toko || 'Toko Saya',
          cashierName: profile.full_name || userData.user.email || 'Kasir',
          items,
          subtotal: total,
          total: finalTotal,
          discountAmount,
          taxAmount,
          paymentMethod,
          amountPaid: paidAmount,
          changeAmount: change,
          createdAt: new Date(),
        })
        setReceiptOpen(true)
        clearCart()
        setAmountPaid('')
        setDiscount('')
        setError('Transaksi disimpan offline. Akan disinkronkan saat online kembali.')
        return
      }

      const { data: txId, error: txError } = await supabase.rpc('process_transaction', payload)

      if (txError) throw new Error(txError.message)

      setReceipt({
        transactionId: txId as string,
        storeName: profile.store?.nama_toko || 'Toko Saya',
        cashierName: profile.full_name || userData.user.email || 'Kasir',
        items,
        subtotal: total,
        total: finalTotal,
        discountAmount,
        taxAmount,
        paymentMethod,
        amountPaid: paidAmount,
        changeAmount: change,
        createdAt: new Date(),
      })
      setReceiptOpen(true)

      clearCart()
      setAmountPaid('')
      setDiscount('')
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [items, total, finalTotal, discountAmount, paymentMethod, amountPaid, change, clearCart, mutate, supabase, dict, activeShift, customerId, taxAmount, isOffline, offlineQueue])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); document.getElementById('search-product')?.focus() }
      if (e.key === 'F8') { e.preventDefault(); handleCheckout() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCheckout])

  if (isCheckingShift) return <div className="p-8 flex justify-center">{dict.common.loading}</div>

  const handleCloseShiftClick = async () => {
    if (!activeShift) return
    // Ambil semua transaksi valid (tidak dibatalkan) pada shift ini untuk summary
    const { data } = await supabase
      .from('transactions')
      .select('total_amount, payment_method')
      .eq('shift_id', activeShift.id)
      .eq('status', 'COMPLETED')
    
    const cashSales = data?.filter(t => t.payment_method === 'TUNAI')
      .reduce((sum, tx) => sum + Number(tx.total_amount), 0) || 0
    const totalRevenue = data?.reduce((sum, tx) => sum + Number(tx.total_amount), 0) || 0
    const totalNonCash = totalRevenue - cashSales
    const totalTransactions = data?.length || 0
    
    setShiftStats({ cashSales, totalTransactions, totalRevenue, totalNonCash })
    setCloseShiftOpen(true)
  }

  const SHIFT_ICON: Record<string, React.ReactNode> = {
    PAGI: <Sun className="h-3.5 w-3.5 text-amber-500" />,
    SIANG: <Sunset className="h-3.5 w-3.5 text-orange-500" />,
    MALAM: <Moon className="h-3.5 w-3.5 text-blue-400" />,
  }

  return (
    <>
      <OpenShiftDialog
        open={openShiftDialogOpen}
        onClose={() => setOpenShiftDialogOpen(false)}
        storeId={storeId}
        cashierId={cashierId}
        onSuccess={(shift) => {
          setActiveShift(shift)
          setOpenShiftDialogOpen(false)
        }}
      />


      {activeShift && (
        <CloseShiftDialog
          open={closeShiftOpen}
          onClose={() => setCloseShiftOpen(false)}
          onSuccess={(data) => {
            setActiveShift(null)
            if (data) setZReportData(data)
          }}
          shift={activeShift}
          cashSales={shiftStats.cashSales}
          totalTransactions={shiftStats.totalTransactions}
          totalRevenue={shiftStats.totalRevenue}
          totalNonCashRevenue={shiftStats.totalNonCash}
        />
      )}

      {/* Header bar untuk POS */}
      <div className="flex flex-col gap-3 mb-4 print:hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">{dict.dashboard.posTitle}</h1>
            {isOffline && (
              <Badge variant="destructive" className="animate-pulse">Offline Mode</Badge>
            )}
            {!isOffline && offlineQueue.length > 0 && (
              <Button variant="outline" size="sm" onClick={syncOfflineQueue} disabled={loading} className="text-orange-600 border-orange-200 bg-orange-50">
                Sync {offlineQueue.length} Transaksi
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!activeShift && !isCheckingShift && (
              <Button
                onClick={() => setOpenShiftDialogOpen(true)}
                className="gap-2"
                disabled={storeId === ''}
              >
                <Wallet className="h-4 w-4" />
                Pilih Shift
              </Button>
            )}
            {activeShift && (
              <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={handleCloseShiftClick}>
                <Wallet className="h-4 w-4 mr-2" />
                {dict.shift?.closeShift || 'Tutup Shift'}
              </Button>
            )}
          </div>
        </div>

        {/* Shift Active Info Bar */}
        {activeShift && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/60 border border-border/50 text-sm">
            <div className="flex items-center gap-1.5 font-semibold">
              {SHIFT_ICON[activeShift.shift_label]}
              <span>{activeShift.shift_label === 'PAGI' ? 'Shift Pagi' : activeShift.shift_label === 'SIANG' ? 'Shift Siang' : 'Shift Malam'}</span>
              <span className="text-muted-foreground font-normal">#{activeShift.shift_number}</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Mulai {new Date(activeShift.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>Modal: <span className="font-medium text-foreground">{formatRupiah(activeShift.starting_cash)}</span></span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[calc(100vh-10rem)] print:hidden">
        {/* Daftar Produk */}
        <Card className="lg:col-span-2 flex flex-col bg-card/50 backdrop-blur-md shadow-xl border-border/50 overflow-hidden h-[60vh] lg:h-full py-0">
          <CardHeader className="border-b bg-card/50 pb-4 pt-4 shrink-0">
            <CardTitle>{dict.pos.products}</CardTitle>
            <Input
              id="search-product"
              placeholder={dict.pos.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addItem(product)}
                  disabled={product.stock_quantity <= 0}
                  className="flex flex-col items-start p-0 border-2 border-border shadow-[2px_2px_0px_0px_var(--color-border)] rounded-2xl bg-card transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden hover:-translate-y-1 hover:border-primary hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
                >
                  {product.image_url && (
                    <div className="w-full aspect-square bg-muted relative border-b-2 border-border/50 group-hover:border-primary/20 transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-4 w-full flex flex-col items-start bg-card z-10">
                    {product.kategori && (
                      <span className="text-[10px] font-bold tracking-wider uppercase text-secondary-foreground bg-secondary/20 px-2 py-0.5 rounded-sm mb-2">
                        {product.kategori}
                      </span>
                    )}
                    <span className="font-heading font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">{product.name}</span>
                    <span className="text-xs text-muted-foreground mt-1 font-mono">{product.sku || '—'}</span>
                    <div className="flex items-center justify-between w-full mt-4 gap-3">
                      <span className="font-bold text-primary text-lg shrink-0">{formatRupiah(product.price)}</span>
                      <Badge
                        variant={product.stock_quantity > 10 ? 'secondary' : product.stock_quantity > 0 ? 'outline' : 'destructive'}
                        className="text-[10px] px-2 py-0.5 font-bold tracking-wide shrink-0"
                      >
                        {product.stock_quantity > 0 ? `STOK: ${product.stock_quantity}` : dict.pos.outOfStock}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-16">
                  {dict.pos.noProducts}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Keranjang & Pembayaran */}
        <Card className="flex flex-col bg-card/50 backdrop-blur-md shadow-xl border-border/50 min-h-[50vh] lg:min-h-0 lg:h-full py-0 overflow-hidden">
          <CardHeader className="border-b bg-primary/5 pt-4 pb-4 shrink-0">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {dict.pos.cart}
              {items.length > 0 && (
                <Badge className="ml-auto">{items.reduce((s, i) => s + i.quantity, 0)} {dict.pos.item}</Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-0 min-h-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-3">{dict.pos.item}</TableHead>
                  <TableHead className="px-4 py-3 w-16">{dict.pos.qty}</TableHead>
                  <TableHead className="px-4 py-3 text-right">{dict.pos.price}</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const hasWarning = getStockWarning(item.product_id)
                  return (
                    <TableRow key={item.product_id} className={hasWarning ? 'bg-destructive/5' : ''}>
                      <TableCell className="px-4 py-3 font-medium text-sm">
                        {item.name}
                        {hasWarning && (
                          <div className="text-[10px] text-destructive font-medium">{dict.pos.stockWarning}</div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                          className={`h-8 w-16 px-2 text-center text-sm ${hasWarning ? 'border-destructive' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm">{formatRupiah(item.price * item.quantity)}</TableCell>
                      <TableCell className="px-2 py-3">
                        <button onClick={() => removeItem(item.product_id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12 text-sm">
                      {dict.pos.emptyCart}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>

          <CardFooter className="flex-col border-t bg-card/50 p-4 gap-4 shrink-0 overflow-y-auto max-h-[50vh]">
            {/* Subtotal */}
            {discountAmount > 0 && (
              <div className="flex justify-between w-full text-sm text-muted-foreground">
                <span>{dict.pos.subtotal}</span>
                <span>{formatRupiah(total)}</span>
              </div>
            )}

            {/* Diskon */}
            <div className="w-full space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> {dict.pos.discount}
              </label>
              <Input
                type="number"
                min="0"
                max={total}
                placeholder={dict.pos.discountPlaceholder}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full h-10"
              />
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-orange-500 font-medium">
                  <span>Diskon</span>
                  <span>-{formatRupiah(discountAmount)}</span>
                </div>
              )}
            </div>

            {/* Pajak */}
            {taxAmount > 0 && (
              <div className="flex justify-between w-full text-sm text-muted-foreground mt-2">
                <span>Pajak / PPN ({taxRate}%)</span>
                <span>{formatRupiah(taxAmount)}</span>
              </div>
            )}

            <div className="flex justify-between w-full text-xl font-bold mt-2">
              <span>{dict.pos.total}</span>
              <span className="text-primary">{formatRupiah(finalTotal)}</span>
            </div>

            <Separator />

            {/* Pelanggan */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Pelanggan</div>
              <Select value={customerId} onValueChange={(v) => v && setCustomerId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Pelanggan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Umum (Walk-in)</SelectItem>
                  {customers?.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-2" />

            {/* Metode Pembayaran */}
            <div className="w-full space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{dict.pos.paymentMethod}</label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input Uang Tunai */}
            {paymentMethod === 'TUNAI' && (
              <div className="w-full space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{dict.pos.amountReceived}</label>
                <Input
                  type="number"
                  min={finalTotal}
                  placeholder={`Min. ${formatRupiah(finalTotal)}`}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full h-10"
                />
                {Number(amountPaid) >= finalTotal && (
                  <div className="flex justify-between text-sm font-semibold text-green-600 dark:text-green-400">
                    <span>{dict.pos.change}</span>
                    <span>{formatRupiah(change)}</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="w-full p-3 text-xs text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {hasStockWarning && (
              <div className="w-full p-3 text-xs text-orange-600 bg-orange-500/10 rounded-md">
                ⚠️ {dict.pos.stockWarning}
              </div>
            )}

            {!activeShift && !isCheckingShift && (
              <div className="w-full p-3 text-xs font-medium text-amber-600 bg-amber-500/10 rounded-md flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Transaksi ditangguhkan. Silakan pilih atau buka shift terlebih dahulu.</span>
              </div>
            )}

            <Button
              size="lg"
              className="w-full h-12 text-base font-bold mt-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md transition-all active:scale-[0.98]"
              onClick={handleCheckout}
              disabled={
                !activeShift ||
                items.length === 0 ||
                loading ||
                hasStockWarning ||
                (paymentMethod === 'TUNAI' && Number(amountPaid) < finalTotal)
              }
            >
              {loading ? dict.pos.processing : dict.pos.pay}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <ReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receipt={receipt}
      />

      <ZReportDialog
        open={!!zReportData}
        onClose={() => setZReportData(null)}
        report={zReportData}
      />
    </>
  )
}
