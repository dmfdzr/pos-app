'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatRupiah } from '@/lib/format'
import { useDictionary } from '@/lib/i18n/use-dictionary'
import { TrendingUp, Receipt, BarChart3, Download, ChevronRight, Clock, Sun, Sunset, Moon, Wallet, Users } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { useEffect } from 'react'

type FilterPeriod = 'today' | '7days' | '30days' | 'all'

type Transaction = {
  id: string
  created_at: string
  total_amount: number
  payment_method: string
  amount_paid: number | null
  change_amount: number | null
  discount_amount: number
  notes: string | null
  status: string
  cashier: { full_name: string | null } | null
}

type TransactionItem = {
  id: string
  product_name: string
  product_sku: string | null
  price_at_time: number
  quantity: number
  subtotal: number
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  TUNAI: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  QRIS: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  TRANSFER_BANK: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  KARTU_DEBIT: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  KARTU_KREDIT: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
}

const PAYMENT_LABELS: Record<string, string> = {
  TUNAI: '💵 Tunai',
  QRIS: '📱 QRIS',
  TRANSFER_BANK: '🏦 Transfer Bank',
  KARTU_DEBIT: '💳 Kartu Debit',
  KARTU_KREDIT: '💳 Kartu Kredit',
}

type ShiftReport = {
  id: string
  shift_label: 'PAGI' | 'SIANG' | 'MALAM'
  shift_number: number
  start_time: string
  end_time: string | null
  starting_cash: number
  ending_cash: number | null
  expected_cash: number | null
  cash_difference: number | null
  total_transactions: number | null
  total_revenue: number | null
  total_non_cash_revenue: number | null
  cashier_name: string | null
  store_name: string | null
  duration_hours: number | null
  notes: string | null
}

const SHIFT_ICON_MAP: Record<string, React.ReactNode> = {
  PAGI: <Sun className="h-3.5 w-3.5 text-amber-500" />,
  SIANG: <Sunset className="h-3.5 w-3.5 text-orange-500" />,
  MALAM: <Moon className="h-3.5 w-3.5 text-blue-400" />,
}

const SHIFT_COLOR_MAP: Record<string, string> = {
  PAGI: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  SIANG: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  MALAM: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
}

export default function ReportsPage() {
  const supabase = createClient()
  const dict = useDictionary()
  const [activeTab, setActiveTab] = useState<'transactions' | 'shifts' | 'schedule'>('transactions')
  const [period, setPeriod] = useState<FilterPeriod>('today')
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  
  const [userRole, setUserRole] = useState<string>('OWNER')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null)
  const [stores, setStores] = useState<{ id: string; nama_toko: string }[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('ALL')

  useEffect(() => {
    const loadUserAndStores = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: profile } = await supabase.from('profiles').select('role, store_id').eq('id', user.id).single()
        if (profile?.role) {
          setUserRole(profile.role)
          if (profile.store_id) setCurrentStoreId(profile.store_id)
          if (profile.role === 'SUPERADMIN') {
            const { data: storesData } = await supabase.from('stores').select('id, nama_toko').order('nama_toko')
            if (storesData) setStores(storesData)
          }
        }
      }
    }
    loadUserAndStores()
  }, [supabase])

  const getDateFilter = useCallback(() => {
    const now = new Date()
    if (period === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return start.toISOString()
    }
    if (period === '7days') {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return start.toISOString()
    }
    if (period === '30days') {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      return start.toISOString()
    }
    return null
  }, [period])

  const fetcher = useCallback(async () => {
    let query = supabase
      .from('transactions')
      .select('*, cashier:profiles(full_name)')
      .order('created_at', { ascending: false })

    // CASHIER: only see their own transactions in their store
    if (userRole === 'CASHIER') {
      if (currentUserId) query = query.eq('cashier_id', currentUserId)
      if (currentStoreId) query = query.eq('store_id', currentStoreId)
    } else if (selectedStore !== 'ALL') {
      query = query.eq('store_id', selectedStore)
    }

    const dateFilter = getDateFilter()
    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Transaction[]
  }, [period, supabase, getDateFilter, selectedStore, userRole, currentUserId, currentStoreId])

  const { data: transactions, isLoading } = useSWR(
    `reports-${period}-${selectedStore}-${currentUserId}`,
    fetcher
  )

  const fetchItems = async (txId: string) => {
    const { data } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', txId)
    return data as TransactionItem[]
  }

  const [txItems, setTxItems] = useState<TransactionItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  const openDetail = async (tx: Transaction) => {
    setSelectedTx(tx)
    setDetailOpen(true)
    setLoadingItems(true)
    const items = await fetchItems(tx.id)
    setTxItems(items || [])
    setLoadingItems(false)
  }

  // Shift fetcher (for OWNER/SUPERADMIN: all shifts filtered by store)
  const shiftFetcher = useCallback(async () => {
    let query = supabase
      .from('shift_reports')
      .select('*')
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false })
      .limit(50)

    if (userRole === 'CASHIER' && currentStoreId) {
      query = query.eq('store_id', currentStoreId)
    } else if (selectedStore !== 'ALL') {
      query = query.eq('store_id', selectedStore)
    }

    const { data, error } = await query
    if (error) throw error
    return data as ShiftReport[]
  }, [supabase, selectedStore, userRole, currentStoreId])

  const { data: shiftReports, isLoading: isLoadingShifts } = useSWR(
    `shift-reports-${selectedStore}-${currentStoreId}`,
    shiftFetcher
  )

  // Schedule fetcher: shifts assigned to this cashier (open/scheduled)
  const scheduleFetcher = useCallback(async () => {
    if (!currentUserId || !currentStoreId) return []
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('cashier_id', currentUserId)
      .order('start_time', { ascending: true })
      .limit(20)
    if (error) throw error
    return data
  }, [supabase, currentUserId, currentStoreId])

  const { data: myShifts, isLoading: isLoadingSchedule } = useSWR(
    currentUserId ? `my-shifts-${currentUserId}` : null,
    scheduleFetcher
  )

  // Metrics
  const validTransactions = transactions?.filter(t => t.status !== 'VOID') || []
  const totalRevenue = validTransactions.reduce((s, t) => s + t.total_amount, 0)
  const totalCount = validTransactions.length
  const avgTransaction = totalCount > 0 ? totalRevenue / totalCount : 0

  // Export to CSV
  const exportCsv = () => {
    if (!transactions?.length) return
    const headers = ['Tanggal', 'No. Transaksi', 'Kasir', 'Metode Bayar', 'Diskon', 'Total']
    const rows = transactions.map(tx => [
      new Date(tx.created_at).toLocaleString('id-ID'),
      tx.id.slice(0, 8).toUpperCase(),
      tx.cashier?.full_name || 'N/A',
      tx.payment_method,
      tx.discount_amount,
      tx.total_amount,
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filterButtons: { key: FilterPeriod; label: string }[] = [
    { key: 'today', label: dict.reports.filterToday },
    { key: '7days', label: dict.reports.filter7days },
    { key: '30days', label: dict.reports.filter30days },
    { key: 'all', label: dict.reports.filterAll },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{dict.reports.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'SUPERADMIN' && stores.length > 0 && (
            <Select value={selectedStore} onValueChange={(val) => val && setSelectedStore(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pilih Toko" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Toko</SelectItem>
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nama_toko}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {activeTab === 'transactions' && (
            <Button variant="outline" onClick={exportCsv} disabled={!transactions?.length} className="gap-2">
              <Download className="h-4 w-4" />
              {dict.reports.exportCsv}
            </Button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-border pb-0">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'transactions'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Transaksi
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'shifts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4" />
          Riwayat Shift
        </button>
        {userRole === 'CASHIER' && (
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'schedule'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            Jadwal Shift Saya
          </button>
        )}
      </div>

      {/* Filter Periode — only for transactions tab */}
      {activeTab === 'transactions' && (
        <div className="flex gap-2">
          {filterButtons.map(({ key, label }) => (
            <Button
              key={key}
              variant={period === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {/* ===== TAB: TRANSAKSI ===== */}
      {activeTab === 'transactions' && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card/50 backdrop-blur-md shadow-lg border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{dict.reports.totalRevenue}</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatRupiah(totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-md shadow-lg border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{dict.reports.totalTransactions}</CardTitle>
                <Receipt className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCount}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-md shadow-lg border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{dict.reports.avgTransaction}</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatRupiah(avgTransaction)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabel Transaksi */}
          <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
            <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">{dict.reports.transactionId}</TableHead>
                  <TableHead className="px-4 py-4">{dict.reports.date}</TableHead>
                  <TableHead className="px-4 py-4">{dict.reports.cashier}</TableHead>
                  <TableHead className="px-4 py-4">{dict.reports.paymentMethod}</TableHead>
                  <TableHead className="px-4 py-4 text-right">{dict.reports.discount}</TableHead>
                  <TableHead className="px-4 py-4 text-right">{dict.reports.total}</TableHead>
                  <TableHead className="px-4 py-4 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map(tx => (
                  <TableRow
                    key={tx.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openDetail(tx)}
                  >
                    <TableCell className="px-6 py-4 font-mono text-sm font-semibold">
                      #{tx.id.slice(0, 8).toUpperCase()}
                      {tx.status === 'VOID' && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] bg-destructive/10 text-destructive border border-destructive/20 font-bold uppercase tracking-wider">
                          VOID
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm">{tx.cashier?.full_name || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PAYMENT_METHOD_COLORS[tx.payment_method] || ''}`}>
                        {PAYMENT_LABELS[tx.payment_method] || tx.payment_method}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right text-sm text-muted-foreground">
                      {tx.discount_amount > 0 ? (
                        <span className="text-orange-500">-{formatRupiah(tx.discount_amount)}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right font-bold text-primary">
                      {formatRupiah(tx.total_amount)}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
                {(!transactions || transactions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-16">
                      {dict.reports.noTransactions}
                    </TableCell>
                  </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {/* ===== TAB: RIWAYAT SHIFT ===== */}
      {activeTab === 'shifts' && (
        <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardContent className="p-0">
            {isLoadingShifts ? (
              <div className="space-y-2 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="px-4">Shift</TableHead>
                      <TableHead>Kasir</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead className="text-center">Durasi</TableHead>
                      <TableHead className="text-center">Transaksi</TableHead>
                      <TableHead className="text-right">Total Pendapatan</TableHead>
                      <TableHead className="text-center">Selisih Kas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftReports?.map((shift) => {
                      const dH = Math.floor((shift.duration_hours || 0))
                      const dM = Math.round(((shift.duration_hours || 0) % 1) * 60)
                      const diff = shift.cash_difference
                      return (
                        <TableRow key={shift.id} className="hover:bg-muted/30">
                          <TableCell className="px-4 py-3">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-semibold ${SHIFT_COLOR_MAP[shift.shift_label]}`}>
                              {SHIFT_ICON_MAP[shift.shift_label]}
                              <span>{shift.shift_label === 'PAGI' ? 'Pagi' : shift.shift_label === 'SIANG' ? 'Siang' : 'Malam'}</span>
                              <span className="font-normal opacity-70">#{shift.shift_number}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {shift.cashier_name || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              <div>{new Date(shift.start_time).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                              <div>{new Date(shift.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} – {shift.end_time ? new Date(shift.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '...'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {dH}j {dM}m
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {shift.total_transactions ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {shift.total_revenue != null ? formatRupiah(shift.total_revenue) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {diff != null ? (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                diff < 0 ? 'bg-destructive/10 text-destructive' : diff > 0 ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
                              }`}>
                                {diff > 0 ? '+' : ''}{formatRupiah(diff)}
                              </span>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {(!shiftReports || shiftReports.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-16">
                          Belum ada riwayat shift yang selesai.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {dict.reports.detailTitle} — #{selectedTx?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">{dict.reports.date}</div>
                  <div className="font-medium">
                    {new Date(selectedTx.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">{dict.reports.cashier}</div>
                  <div className="font-medium">{selectedTx.cashier?.full_name || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">{dict.reports.paymentMethod}</div>
                  <div className="font-medium">{PAYMENT_LABELS[selectedTx.payment_method]}</div>
                </div>
                {selectedTx.payment_method === 'TUNAI' && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs">Kembalian</div>
                    <div className="font-medium text-green-600">{formatRupiah(selectedTx.change_amount || 0)}</div>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <div className="text-sm font-semibold mb-3">{dict.reports.items}</div>
                {loadingItems ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {txItems.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div>
                          <span className="font-medium">{item.product_name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">x{item.quantity}</span>
                        </div>
                        <span className="font-medium">{formatRupiah(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatRupiah(selectedTx.total_amount + selectedTx.discount_amount)}</span>
                </div>
                {selectedTx.discount_amount > 0 && (
                  <div className="flex justify-between text-orange-500">
                    <span>{dict.reports.discount}</span>
                    <span>-{formatRupiah(selectedTx.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>{dict.reports.total}</span>
                  <span className="text-primary">{formatRupiah(selectedTx.total_amount)}</span>
                </div>
              </div>

              {selectedTx.status !== 'VOID' && ['SUPERADMIN', 'OWNER'].includes(userRole) && (
                <div className="pt-4 border-t mt-4">
                  <Button 
                    variant="destructive" 
                    className="w-full text-sm"
                    onClick={async () => {
                      if (!confirm('Apakah Anda yakin ingin membatalkan transaksi ini? Stok akan dikembalikan.')) return;
                      
                      const notes = prompt('Masukkan alasan pembatalan:');
                      if (!notes) return;
                      
                      const { error } = await supabase.rpc('void_transaction', {
                        p_transaction_id: selectedTx.id,
                        p_user_id: currentUserId,
                        p_notes: notes
                      });
                      
                      if (error) {
                        alert('Gagal membatalkan transaksi: ' + error.message);
                      } else {
                        alert('Transaksi berhasil dibatalkan.');
                        setDetailOpen(false);
                        // trigger refetch using swr mutate implicitly if we were to import it, but we can just reload or rely on real-time/focus
                        window.location.reload();
                      }
                    }}
                  >
                    Batalkan Transaksi
                  </Button>
                </div>
              )}
              {selectedTx.status === 'VOID' && (
                <div className="pt-4 border-t mt-4 text-center text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg">
                  Transaksi ini telah dibatalkan
                  {selectedTx.notes && <div className="text-xs mt-1 opacity-80">{selectedTx.notes}</div>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== TAB: JADWAL SHIFT SAYA (CASHIER ONLY) ===== */}
      {activeTab === 'schedule' && userRole === 'CASHIER' && (
        <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Jadwal Shift Saya
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingSchedule ? (
              <div className="space-y-2 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : !myShifts?.length ? (
              <div className="text-center text-muted-foreground py-16">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Belum ada jadwal shift yang tercatat.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {myShifts.map((shift) => {
                  const start = new Date(shift.start_time)
                  const end = shift.end_time ? new Date(shift.end_time) : null
                  const now = new Date()

                  let statusLabel = 'Selesai'
                  let statusClass = 'bg-muted text-muted-foreground'
                  if (!shift.end_time) {
                    if (start > now) {
                      statusLabel = 'Terjadwal'
                      statusClass = 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                    } else {
                      statusLabel = 'Berlangsung'
                      statusClass = 'bg-green-500/10 text-green-600 border border-green-500/20'
                    }
                  }

                  const shiftIcon = shift.shift_label === 'PAGI'
                    ? <Sun className="h-4 w-4 text-amber-500" />
                    : shift.shift_label === 'SIANG'
                      ? <Sunset className="h-4 w-4 text-orange-500" />
                      : <Moon className="h-4 w-4 text-blue-400" />

                  return (
                    <div key={shift.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex-shrink-0">{shiftIcon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {shift.shift_label} #{shift.shift_number}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {start.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                          {' — '}
                          {start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          {end ? ` s/d ${end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ' (Belum selesai)'}
                        </div>
                      </div>
                      {shift.starting_cash !== null && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-muted-foreground">Kas Awal</div>
                          <div className="text-sm font-medium">{formatRupiah(shift.starting_cash)}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>

  )
}
