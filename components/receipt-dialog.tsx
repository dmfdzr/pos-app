'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatRupiah } from '@/lib/format'
import { CheckCircle2, Printer } from 'lucide-react'
import { CartItem } from '@/hooks/use-cart'
import { useDictionary } from '@/lib/i18n/use-dictionary'

export type PaymentMethod = 'TUNAI' | 'QRIS' | 'TRANSFER_BANK' | 'KARTU_DEBIT' | 'KARTU_KREDIT'

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  TUNAI: 'Tunai',
  QRIS: 'QRIS',
  TRANSFER_BANK: 'Transfer Bank',
  KARTU_DEBIT: 'Kartu Debit',
  KARTU_KREDIT: 'Kartu Kredit',
}

export interface ReceiptData {
  transactionId: string
  storeName: string
  cashierName: string
  items: CartItem[]
  subtotal: number
  total: number
  discountAmount: number
  taxAmount?: number
  paymentMethod: PaymentMethod
  amountPaid: number
  changeAmount: number
  createdAt: Date
}

interface ReceiptDialogProps {
  open: boolean
  onClose: () => void
  receipt: ReceiptData | null
}

export function ReceiptDialog({ open, onClose, receipt }: ReceiptDialogProps) {
  const dict = useDictionary()

  if (!receipt) return null

  const dateLocale = dict === null ? 'id-ID' : 'id-ID'

  const handlePrint = () => {
    const printContent = document.getElementById('thermal-receipt')
    if (!printContent) return

    // Create an invisible iframe for printing to avoid popup blockers and page flashes
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(`
      <html>
        <head>
          <title>Cetak Struk</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 12px; 
              margin: 0; 
              padding: 10px; 
              width: 80mm; 
              color: #000;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; }
            .dashed-line { border-top: 1px dashed #000; margin: 8px 0; }
            .mb-2 { margin-bottom: 8px; }
            .text-xs { font-size: 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow?.focus()
    // Small delay to ensure styles are applied
    setTimeout(() => {
      iframe.contentWindow?.print()
      // Clean up after printing
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 100)
  }

  return (
    <>
      {/* Thermal Receipt Data (Hidden on screen) */}
      <div id="thermal-receipt" style={{ display: 'none' }}>
        <div className="text-center font-bold mb-2" style={{ fontSize: '14px' }}>
          {receipt.storeName}
        </div>
        <div className="text-center text-xs mb-2">
          {receipt.createdAt.toLocaleString('id-ID')}
          <br/>
          Kasir: {receipt.cashierName}
        </div>
        <div className="dashed-line"></div>
        {receipt.items.map(item => (
          <div className="mb-2" key={item.product_id}>
            <div>{item.name}</div>
            <div className="flex-between">
              <span>{item.quantity} x {formatRupiah(item.price)}</span>
              <span>{formatRupiah(item.price * item.quantity)}</span>
            </div>
          </div>
        ))}
        <div className="dashed-line"></div>
        {receipt.discountAmount > 0 && (
          <>
            <div className="flex-between">
              <span>Subtotal</span><span>{formatRupiah(receipt.subtotal)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex-between">
                <span>Diskon</span><span>-{formatRupiah(receipt.discountAmount)}</span>
              </div>
            )}
            {receipt.taxAmount ? (
              <div className="flex-between">
                <span>Pajak (PPN)</span><span>{formatRupiah(receipt.taxAmount)}</span>
              </div>
            ) : null}
          </>
        )}
        {(receipt.discountAmount === 0 && receipt.taxAmount ? (
          <div className="flex-between">
            <span>Pajak (PPN)</span><span>{formatRupiah(receipt.taxAmount)}</span>
          </div>
        ) : null)}
        <div className="flex-between font-bold">
          <span>TOTAL</span><span>{formatRupiah(receipt.total)}</span>
        </div>
        <div className="flex-between text-xs">
          <span>Metode</span><span>{PAYMENT_LABEL[receipt.paymentMethod]}</span>
        </div>
        {receipt.paymentMethod === 'TUNAI' && (
          <>
            <div className="flex-between text-xs">
              <span>Dibayar</span><span>{formatRupiah(receipt.amountPaid)}</span>
            </div>
            <div className="flex-between text-xs">
              <span>Kembali</span><span>{formatRupiah(receipt.changeAmount)}</span>
            </div>
          </>
        )}
        <div className="dashed-line"></div>
        <div className="text-center text-xs">Terima kasih sudah berbelanja!</div>
        <div className="text-center text-xs">No: {receipt.transactionId.slice(0, 8).toUpperCase()}</div>
      </div>

      {/* UI Dialog */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm print:hidden">
          <DialogHeader>
            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-lg">{dict.receipt.success}</DialogTitle>
            </div>
          </DialogHeader>

          {/* Struk UI */}
          <div className="font-mono text-sm space-y-2 bg-muted/50 rounded-lg p-4">
            <div className="text-center font-bold text-base">{receipt.storeName}</div>
            <div className="text-center text-xs text-muted-foreground">
              {receipt.createdAt.toLocaleDateString(dateLocale, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
              {' '}
              {receipt.createdAt.toLocaleTimeString(dateLocale)}
            </div>
            <div className="text-xs text-muted-foreground">No: {receipt.transactionId.slice(0, 8).toUpperCase()}</div>
            <div className="text-xs text-muted-foreground">{dict.receipt.cashier}: {receipt.cashierName}</div>

            <Separator className="my-2" />

            {receipt.items.map(item => (
              <div key={item.product_id} className="space-y-0.5">
                <div className="font-medium truncate">{item.name}</div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.quantity} x {formatRupiah(item.price)}</span>
                  <span>{formatRupiah(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}

            <Separator className="my-2" />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{dict.receipt.subtotal}</span>
              <span>{formatRupiah(receipt.subtotal)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-xs text-orange-500 font-medium">
                <span>{dict.receipt.discount}</span>
                <span>-{formatRupiah(receipt.discountAmount)}</span>
              </div>
            )}
            {receipt.taxAmount ? (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pajak (PPN)</span>
                <span>{formatRupiah(receipt.taxAmount)}</span>
              </div>
            ) : null}

            <div className="flex justify-between font-bold text-base">
              <span>{dict.receipt.total}</span>
              <span>{formatRupiah(receipt.total)}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span>{dict.receipt.paymentMethod}</span>
              <span className="font-medium">{PAYMENT_LABEL[receipt.paymentMethod]}</span>
            </div>

            {receipt.paymentMethod === 'TUNAI' && (
              <>
                <div className="flex justify-between text-xs">
                  <span>{dict.receipt.paid}</span>
                  <span>{formatRupiah(receipt.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-green-600 dark:text-green-400">
                  <span>{dict.receipt.change}</span>
                  <span>{formatRupiah(receipt.changeAmount)}</span>
                </div>
              </>
            )}

            <Separator className="my-2" />
            <div className="text-center text-xs text-muted-foreground">
              {dict.receipt.thankYou}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {dict.receipt.print}
            </Button>
            <Button className="flex-1" onClick={onClose}>
              {dict.receipt.newTransaction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
