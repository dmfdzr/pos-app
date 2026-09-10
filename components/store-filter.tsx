'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StoreFilterProps {
  stores: { id: string; nama_toko: string }[]
}

export function StoreFilter({ stores }: StoreFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const currentStore = searchParams.get('store_id') || 'ALL'

  const handleChange = (val: string | null) => {
    if (!val) return
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'ALL') {
      params.delete('store_id')
    } else {
      params.set('store_id', val)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  if (stores.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Filter Toko:</span>
      <Select value={currentStore} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Pilih Toko" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Semua Toko</SelectItem>
          {stores.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.nama_toko}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
