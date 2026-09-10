'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'
import { Printer } from 'lucide-react'

export interface ZReportData {
  shiftLabel: string
  shiftNumber: number
  startTime: string
  endTime: string | null
  cashierName: string
  storeName: string
  startingCash: number
  endingCash: number | null
  expectedCash: number | null
  totalTransactions: number
  totalRevenue: number
  totalCash: number
  totalNonCash: number
}

interface ZReportDialogProps {
  open: boolean
  onClose: () => void
  report: ZReportData | null
}

export function ZReportDialog({ open, onClose, report }: ZReportDialogProps) {
  if (!report) return null

  const handlePrint = () => {
    const printContent = document.getElementById('thermal-z-report')
    if (!printContent) return

    const originalTitle = document.title
    document.title = `Z-Report-${report.shiftLabel}-${new Date().getTime()}`

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '-1000px'
    iframe.style.bottom = '-1000px'
    iframe.style.width = '300px'
    iframe.style.height = '100vh'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) return

    iframeDoc.open()
    iframeDoc.write(`
      <html>
        <head>
          <title>${document.title}</title>
          <style>
            @page { margin: 0; size: 58mm auto; }
            body { 
              font-family: monospace; 
              font-size: 12px; 
              margin: 0; 
              padding: 10px;
              width: 58mm;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .dashed-line { border-top: 1px dashed #000; margin: 8px 0; }
            .mb-2 { margin-bottom: 8px; }
            .mt-2 { margin-top: 8px; }
            .text-xs { font-size: 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      document.title = originalTitle
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 500)
  }

  const discrepancy = (report.endingCash || 0) - (report.expectedCash || 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm print:hidden">
        <DialogHeader>
          <div className="flex justify-between items-center mb-2">
            <DialogTitle>Z-Report Shift</DialogTitle>
          </div>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg overflow-y-auto max-h-[60vh] font-mono text-sm shadow-inner relative">
          {/* Elemen yang dicetak */}
          <div id="thermal-z-report" className="text-black">
            <div className="text-center font-bold mb-2 text-base">{report.storeName}</div>
            <div className="text-center text-xs mb-2">LAPORAN TUTUP SHIFT (Z-REPORT)</div>
            
            <div className="dashed-line"></div>
            
            <div className="flex-between">
              <span>Kasir</span><span>{report.cashierName}</span>
            </div>
            <div className="flex-between">
              <span>Shift</span><span>{report.shiftLabel} #{report.shiftNumber}</span>
            </div>
            <div className="flex-between text-xs">
              <span>Mulai</span><span>{new Date(report.startTime).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex-between text-xs">
              <span>Selesai</span><span>{report.endTime ? new Date(report.endTime).toLocaleString('id-ID') : 'Belum Tutup'}</span>
            </div>

            <div className="dashed-line"></div>

            <div className="font-bold mb-1">Rincian Saldo</div>
            <div className="flex-between">
              <span>Modal Awal</span><span>{formatRupiah(report.startingCash)}</span>
            </div>
            <div className="flex-between">
              <span>Penerimaan Tunai</span><span>{formatRupiah(report.totalCash)}</span>
            </div>
            <div className="flex-between font-bold">
              <span>Saldo Seharusnya</span><span>{formatRupiah(report.expectedCash || 0)}</span>
            </div>
            <div className="flex-between">
              <span>Saldo Aktual Laci</span><span>{formatRupiah(report.endingCash || 0)}</span>
            </div>
            
            <div className="dashed-line"></div>
            
            <div className="flex-between">
              <span>Selisih (Discrepancy)</span>
              <span className={discrepancy < 0 ? 'text-destructive font-bold' : ''}>
                {discrepancy > 0 ? '+' : ''}{formatRupiah(discrepancy)}
              </span>
            </div>

            <div className="dashed-line"></div>

            <div className="font-bold mb-1">Penjualan</div>
            <div className="flex-between">
              <span>Total Transaksi</span><span>{report.totalTransactions} tx</span>
            </div>
            <div className="flex-between text-xs">
              <span>Tunai</span><span>{formatRupiah(report.totalCash)}</span>
            </div>
            <div className="flex-between text-xs">
              <span>Non-Tunai</span><span>{formatRupiah(report.totalNonCash)}</span>
            </div>
            <div className="flex-between font-bold mt-2">
              <span>TOTAL OMSET</span><span>{formatRupiah(report.totalRevenue)}</span>
            </div>

            <div className="dashed-line"></div>
            <div className="text-center text-xs">Dicetak pada: {new Date().toLocaleString('id-ID')}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Cetak
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
