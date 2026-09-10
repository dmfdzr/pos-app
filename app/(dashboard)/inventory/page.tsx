'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Database } from '@/types/database'
import { formatRupiah } from '@/lib/format'
import { Pencil, Trash2, Plus, PackagePlus } from 'lucide-react'
import { useDictionary } from '@/lib/i18n/use-dictionary'

type Product = Database['public']['Tables']['products']['Row']

const KATEGORI_LIST = [
  'Makanan', 'Minuman', 'Snack', 'Rokok', 'Sembako',
  'Elektronik', 'Pakaian', 'Perawatan Diri', 'Alat Tulis', 'Lainnya',
]

type ProductForm = {
  name: string
  sku: string
  kategori: string
  price: string
  cost_price: string
  stock_quantity: string
  image_url: string
}

const EMPTY_FORM: ProductForm = { name: '', sku: '', kategori: '', price: '', cost_price: '', stock_quantity: '', image_url: '' }

export default function InventoryPage() {
  const supabase = createClient()
  const dict = useDictionary()
  const [userRole, setUserRole] = useState<string>('CASHIER')
  const [stores, setStores] = useState<{ id: string; nama_toko: string }[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('ALL')

  const fetcher = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
      if (profile?.role) {
        setUserRole(profile.role)
        if (profile.role === 'SUPERADMIN') {
          const { data: storesData } = await supabase.from('stores').select('id, nama_toko').order('nama_toko')
          if (storesData) setStores(storesData)
        }
      }
    }
    
    let query = supabase.from('products').select('*').order('name')
    if (selectedStore !== 'ALL') {
      query = query.eq('store_id', selectedStore)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Product[]
  }

  const { data: products, error, mutate } = useSWR(`products-${selectedStore}`, fetcher)
  const isSuperAdmin = userRole === 'SUPERADMIN'
  const isReadOnly = userRole === 'CASHIER' || isSuperAdmin

  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<ProductForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Restock state
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)
  const [restockOpen, setRestockOpen] = useState(false)
  const [restockQty, setRestockQty] = useState('')
  const [restockNotes, setRestockNotes] = useState('')
  const [restockLoading, setRestockLoading] = useState(false)

  const getMargin = (price: number, cost: number | null) => {
    if (!cost || cost === 0) return null
    return Math.round(((price - cost) / price) * 100)
  }

  // === Tambah Produk ===
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setLoading(false); return }

    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', userData.user.id).single()
    if (!profile) { setLoading(false); return }

    await supabase.from('products').insert({
      name: form.name,
      sku: form.sku || null,
      kategori: form.kategori || null,
      price: parseInt(form.price),
      cost_price: form.cost_price ? parseInt(form.cost_price) : null,
      stock_quantity: parseInt(form.stock_quantity),
      image_url: form.image_url || null,
      store_id: profile.store_id,
    })
    mutate()
    setForm(EMPTY_FORM)
    setLoading(false)
  }

  // === Buka Edit ===
  const openEdit = (p: Product) => {
    setEditProduct(p)
    setEditForm({
      name: p.name,
      sku: p.sku || '',
      kategori: p.kategori || '',
      price: String(p.price),
      cost_price: p.cost_price ? String(p.cost_price) : '',
      stock_quantity: String(p.stock_quantity),
      image_url: p.image_url || '',
    })
    setEditOpen(true)
  }

  // === Simpan Edit ===
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editProduct) return
    setLoading(true)
    await supabase.from('products').update({
      name: editForm.name,
      sku: editForm.sku || null,
      kategori: editForm.kategori || null,
      price: parseInt(editForm.price),
      cost_price: editForm.cost_price ? parseInt(editForm.cost_price) : null,
      stock_quantity: parseInt(editForm.stock_quantity),
      image_url: editForm.image_url || null,
    }).eq('id', editProduct.id)
    mutate()
    setEditOpen(false)
    setLoading(false)
  }

  // === Hapus Produk ===
  const handleDelete = async (id: string) => {
    if (!confirm(dict.inventory.deleteConfirm)) return
    await supabase.from('products').delete().eq('id', id)
    mutate()
  }

  // === Restock ===
  const openRestock = (p: Product) => {
    setRestockProduct(p)
    setRestockQty('')
    setRestockNotes('')
    setRestockOpen(true)
  }

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockProduct) return
    setRestockLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setRestockLoading(false); return }

    await supabase.rpc('restock_product', {
      p_product_id: restockProduct.id,
      p_quantity: parseInt(restockQty),
      p_notes: restockNotes || null,
      p_user_id: user.id,
    })

    mutate()
    setRestockOpen(false)
    setRestockLoading(false)
  }

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.kategori?.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{dict.inventory.title}</h1>
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
          {isSuperAdmin && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full border">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              Mode Pantau — Hanya lihat data
            </div>
          )}
          {!isSuperAdmin && isReadOnly && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full border">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              Mode Lihat Saja — Kasir dapat tambah stok
            </div>
          )}
        </div>
      </div>

      <div className={`grid gap-6 ${isReadOnly ? '' : 'md:grid-cols-3'}`}>
        {/* Form Tambah — hanya untuk OWNER/SUPERADMIN */}
        {!isReadOnly && (
          <Card className="md:col-span-1 bg-card/50 backdrop-blur-md shadow-xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> {dict.inventory.addProduct}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">{dict.inventory.name} *</label>
                  <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Aqua 600ml" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">{dict.inventory.sku}</label>
                  <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU-001" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">{dict.inventory.category}</label>
                  <Select value={form.kategori || 'none'} onValueChange={(v) => setForm(f => ({...f, kategori: String(v === 'none' ? '' : v)}))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={dict.inventory.selectCategory} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{dict.inventory.selectCategory}</SelectItem>
                      {KATEGORI_LIST.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{dict.inventory.price} *</label>
                    <Input required type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="5000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{dict.inventory.costPrice}</label>
                    <Input type="number" min="0" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="3000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">{dict.inventory.initialStock} *</label>
                  <Input required type="number" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} placeholder="10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">URL Foto (Opsional)</label>
                  <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? dict.common.loading : dict.inventory.addProduct}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabel Produk */}
        <Card className={`${isReadOnly ? 'col-span-full' : 'md:col-span-2'} bg-card/50 backdrop-blur-md shadow-xl border-border/50`}>
          <CardHeader>
            <CardTitle>{dict.inventory.catalog}</CardTitle>
            <Input className="mt-2" placeholder={dict.inventory.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-md">Error memuat produk.</div>
            ) : !products ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3">{dict.inventory.name}</TableHead>
                    <TableHead className="px-4 py-3">{dict.inventory.category}</TableHead>
                    <TableHead className="px-4 py-3 text-right">{dict.inventory.price}</TableHead>
                    <TableHead className="px-4 py-3 text-right">{dict.inventory.margin}</TableHead>
                    <TableHead className="px-4 py-3 text-center">{dict.inventory.stock}</TableHead>
                    <TableHead className="px-4 py-3 text-right">{dict.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => {
                    const margin = getMargin(p.price, p.cost_price)
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="px-4 py-3">
                          <div className="font-medium">{p.name}</div>
                          {p.sku && <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {p.kategori ? <Badge variant="outline" className="text-xs">{p.kategori}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-medium">{formatRupiah(p.price)}</TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          {margin !== null ? (
                            <span className={`text-sm font-semibold ${margin >= 20 ? 'text-green-600 dark:text-green-400' : margin >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'}`}>
                              {margin}%
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Badge variant={p.stock_quantity > 10 ? 'default' : p.stock_quantity > 0 ? 'outline' : 'destructive'}
                            className={p.stock_quantity < 5 && p.stock_quantity > 0 ? 'border-orange-500 text-orange-600' : ''}>
                            {p.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isSuperAdmin && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" onClick={() => openRestock(p)} title={dict.inventory.restock}>
                                <PackagePlus className="h-4 w-4" />
                              </Button>
                            )}
                            {!isReadOnly && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        {dict.inventory.noProducts}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dict.inventory.editProduct}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{dict.inventory.name} *</label>
              <Input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{dict.inventory.sku}</label>
              <Input value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{dict.inventory.category}</label>
              <Select value={editForm.kategori || 'none'} onValueChange={(v) => setEditForm(f => ({...f, kategori: String(v === 'none' ? '' : v)}))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={dict.inventory.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{dict.inventory.selectCategory}</SelectItem>
                  {KATEGORI_LIST.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{dict.inventory.price} *</label>
                <Input required type="number" min="0" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{dict.inventory.costPrice}</label>
                <Input type="number" min="0" value={editForm.cost_price} onChange={e => setEditForm(f => ({ ...f, cost_price: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{dict.inventory.stock}</label>
              <Input required type="number" min="0" value={editForm.stock_quantity} onChange={e => setEditForm(f => ({ ...f, stock_quantity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">URL Foto (Opsional)</label>
              <Input value={editForm.image_url} onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" type="button" className="flex-1" onClick={() => setEditOpen(false)}>{dict.common.cancel}</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? dict.common.saving : dict.common.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Restock */}
      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              {dict.inventory.restockTitle}
            </DialogTitle>
          </DialogHeader>
          {restockProduct && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium">{restockProduct.name}</div>
              <div className="text-sm text-muted-foreground">Stok saat ini: <span className="font-bold text-foreground">{restockProduct.stock_quantity}</span></div>
            </div>
          )}
          <form onSubmit={handleRestock} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.inventory.restockAmount} *</label>
              <Input
                required
                type="number"
                min="1"
                value={restockQty}
                onChange={e => setRestockQty(e.target.value)}
                placeholder="10"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.inventory.restockNotes}</label>
              <Input
                value={restockNotes}
                onChange={e => setRestockNotes(e.target.value)}
                placeholder="Terima barang dari supplier..."
                className="h-10"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" type="button" className="flex-1" onClick={() => setRestockOpen(false)}>{dict.common.cancel}</Button>
              <Button type="submit" className="flex-1" disabled={restockLoading}>
                {restockLoading ? dict.common.saving : dict.inventory.restockConfirm}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
