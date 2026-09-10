'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatRupiah } from '@/lib/format'
import { useDictionary } from '@/lib/i18n/use-dictionary'
import { createClient } from '@/utils/supabase/client'
import { Wallet, LogOut, Sun, Sunset, Moon, Clock, Receipt, TrendingUp } from 'lucide-react'
import type { ZReportData } from '@/components/z-report-dialog'

export type ShiftLabel = 'PAGI' | 'SIANG' | 'MALAM'

export interface ShiftData {
  id: string
  shift_label: ShiftLabel
  shift_number: number
  starting_cash: number
  start_time: string
}

const SHIFT_LABELS: { value: ShiftLabel; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'PAGI', label: 'Shift Pagi', icon: <Sun className="h-4 w-4" />, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { value: 'SIANG', label: 'Shift Siang', icon: <Sunset className="h-4 w-4" />, color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  { value: 'MALAM', label: 'Shift Malam', icon: <Moon className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
]

interface OpenShiftDialogProps {
  open: boolean
  onClose?: () => void
  onSuccess: (shift: ShiftData) => void
  storeId: string
  cashierId: string
}

export function OpenShiftDialog({ open, onClose, onSuccess, storeId, cashierId }: OpenShiftDialogProps) {
  const dict = useDictionary()
  const supabase = createClient()
  const [startingCash, setStartingCash] = useState('')
  const [shiftLabel, setShiftLabel] = useState<ShiftLabel>('PAGI')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedShiftInfo = SHIFT_LABELS.find(s => s.value === shiftLabel)!

  const handleOpenShift = async () => {
    if (!startingCash) return
    setLoading(true)
    setError(null)
    
    try {
      // Gunakan RPC open_shift untuk mendapatkan nomor shift yang aman (bebas race-condition)
      const { data, error } = await supabase
        .rpc('open_shift', {
          p_store_id: storeId,
          p_cashier_id: cashierId,
          p_starting_cash: Number(startingCash),
          p_shift_label: shiftLabel,
        })

      if (error) throw error
      if (data && data.length > 0) {
        const row = data[0]
        onSuccess({
          id: row.id,
          shift_label: shiftLabel,
          shift_number: row.shift_number,
          starting_cash: Number(startingCash),
          start_time: new Date().toISOString(),
        })
        setStartingCash('')
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message)
      else setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  // Dialog can be closed (onClose prop), unless it was blocked intentionally
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && onClose) onClose() }}>
      <DialogContent className="w-[95vw] sm:w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>{dict.shift?.openShift || 'Buka Shift'}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-2">
            {dict.shift?.startingCashDesc || 'Pilih label shift dan masukkan modal awal laci sebelum memulai transaksi.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Pilih Label Shift */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Waktu Shift</label>
            <div className="grid grid-cols-3 gap-2">
              {SHIFT_LABELS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setShiftLabel(s.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    shiftLabel === s.value
                      ? `${s.color} border-current shadow-sm`
                      : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                  }`}
                >
                  {s.icon}
                  <span className="text-xs">{s.label.replace('Shift ', '')}</span>
                </button>
              ))}
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${selectedShiftInfo.color}`}>
              {selectedShiftInfo.icon}
              <span>{selectedShiftInfo.label} — akan dimulai pukul {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Modal Awal */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.shift?.startingCash || 'Modal Awal Laci (Rp)'}</label>
            <Input
              type="number"
              min="0"
              value={startingCash}
              onChange={(e) => setStartingCash(e.target.value)}
              placeholder="0"
              className="text-lg font-medium h-12"
            />
            {Number(startingCash) > 0 && (
              <p className="text-xs text-muted-foreground text-right">{formatRupiah(Number(startingCash))}</p>
            )}
          </div>
          
          {error && <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
              Batal
            </Button>
          )}
          <Button onClick={handleOpenShift} disabled={loading || !startingCash} className="w-full h-12 text-base flex-1">
            {loading ? dict.common.loading : `Buka ${selectedShiftInfo.label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CloseShiftDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (reportData?: ZReportData) => void
  shift: ShiftData
  cashSales: number
  totalTransactions: number
  totalRevenue: number
  totalNonCashRevenue: number
}

export function CloseShiftDialog({
  open, onClose, onSuccess,
  shift, cashSales, totalTransactions, totalRevenue, totalNonCashRevenue
}: CloseShiftDialogProps) {
  const dict = useDictionary()
  const supabase = createClient()
  const [actualCash, setActualCash] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expectedCash = shift.starting_cash + cashSales
  const diff = Number(actualCash) - expectedCash

  const startTime = new Date(shift.start_time)
  const now = new Date()
  const durationMs = now.getTime() - startTime.getTime()
  const durationH = Math.floor(durationMs / 3600000)
  const durationM = Math.floor((durationMs % 3600000) / 60000)

  const shiftInfo = SHIFT_LABELS.find(s => s.value === shift.shift_label)!

  const handleCloseShift = async () => {
    if (actualCash === '') return
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          end_time: new Date().toISOString(),
          ending_cash: Number(actualCash),
          expected_cash: expectedCash,
          notes: notes || null,
          total_transactions: totalTransactions,
          total_revenue: totalRevenue,
          total_non_cash_revenue: totalNonCashRevenue,
        })
        .eq('id', shift.id)

      if (error) throw error
      
      const endTime = new Date().toISOString()
      
      // Fetch store and user names for the report
      const { data: user } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('full_name, stores(nama_toko)').eq('id', user.user?.id || '').single()

      onSuccess({
        shiftLabel: shiftInfo.label,
        shiftNumber: shift.shift_number,
        startTime: shift.start_time,
        endTime: endTime,
        cashierName: profile?.full_name || 'N/A',
        // @ts-expect-error joined table
        storeName: profile?.stores?.nama_toko || 'N/A',
        startingCash: shift.starting_cash,
        endingCash: Number(actualCash),
        expectedCash: expectedCash,
        totalTransactions: totalTransactions,
        totalRevenue: totalRevenue,
        totalCash: cashSales,
        totalNonCash: totalNonCashRevenue,
      })
      onClose()
      setActualCash('')
      setNotes('')
    } catch (err) {
      if (err instanceof Error) setError(err.message)
      else setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 p-2 rounded-full">
              <LogOut className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {dict.shift?.closeShift || 'Tutup Shift'}
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${shiftInfo.color}`}>
                  {shiftInfo.label} #{shift.shift_number}
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Durasi: {durationH}j {durationM}m
                &nbsp;·&nbsp;
                Mulai: {startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ringkasan Penjualan */}
          <div className="bg-muted/50 p-4 rounded-xl space-y-2.5 text-sm border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <Receipt className="h-3.5 w-3.5" /> Ringkasan Shift
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Transaksi</span>
              <span className="font-semibold">{totalTransactions} transaksi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3"/>Total Pendapatan</span>
              <span className="font-semibold text-primary">{formatRupiah(totalRevenue)}</span>
            </div>
            <div className="border-t border-dashed pt-2.5 mt-1 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rekonsiliasi Kas</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modal Awal Laci</span>
                <span>{formatRupiah(shift.starting_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Penjualan Tunai</span>
                <span className="text-green-600 font-medium">+{formatRupiah(cashSales)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>{dict.shift?.expectedCash || 'Estimasi Kas Sistem'}</span>
                <span className="text-primary">{formatRupiah(expectedCash)}</span>
              </div>
            </div>
          </div>

          {/* Input Kas Fisik */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.shift?.actualCash || 'Uang Fisik di Laci (Rp)'}</label>
            <p className="text-xs text-muted-foreground">
              {dict.shift?.actualCashDesc || 'Hitung dan masukkan total uang tunai yang ada di laci saat ini.'}
            </p>
            <Input
              type="number"
              min="0"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="0"
              className="text-lg font-medium h-12"
            />
          </div>

          {/* Selisih */}
          {actualCash !== '' && (
            <div className={`p-3 rounded-xl text-sm flex justify-between font-semibold border ${
              diff < 0 ? 'bg-destructive/10 text-destructive border-destructive/20' 
              : diff > 0 ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' 
              : 'bg-muted text-muted-foreground border-border'
            }`}>
              <span>{dict.shift?.difference || 'Selisih'} {diff < 0 ? '⚠️ Kurang' : diff > 0 ? '✅ Lebih' : '✅ Pas'}</span>
              <span>{diff > 0 ? '+' : ''}{formatRupiah(diff)}</span>
            </div>
          )}

          {/* Catatan */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.shift?.notes || 'Catatan (opsional)'}</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan..."
            />
          </div>

          {error && <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>{dict.common.cancel}</Button>
          <Button variant="destructive" onClick={handleCloseShift} disabled={loading || actualCash === ''}>
            {loading ? dict.common.loading : dict.shift?.closeShift || 'Tutup Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
