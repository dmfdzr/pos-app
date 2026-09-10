'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Database } from '@/types/database'

type Customer = Database['public']['Tables']['customers']['Row']

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [storeId, setStoreId] = useState<string>('')
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)

  const loadCustomers = useCallback(async (sId: string) => {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').eq('store_id', sId).order('name')
    setCustomers(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const fetchStore = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('store_id, role').eq('id', user.id).single()
      if (profile?.store_id) {
        setStoreId(profile.store_id)
        loadCustomers(profile.store_id)
      }
    }
    fetchStore()
  }, [supabase, loadCustomers])

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (formData.id) {
        // Update
        await supabase.from('customers').update({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
        }).eq('id', formData.id)
      } else {
        // Insert
        await supabase.from('customers').insert({
          store_id: storeId,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
        })
      }
      setDialogOpen(false)
      loadCustomers(storeId)
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan pelanggan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus pelanggan ${name}?`)) return
    await supabase.from('customers').delete().eq('id', id)
    loadCustomers(storeId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          Pelanggan
        </h1>
        <Button onClick={() => {
          setFormData({ id: '', name: '', phone: '', email: '' })
          setDialogOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" /> Tambah
        </Button>
      </div>

      <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
        <CardHeader className="pb-4">
          <div className="flex gap-2 relative max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Cari nama atau telepon..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="px-6 py-4">Nama Pelanggan</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right px-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Tidak ada data pelanggan.</TableCell>
                </TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="px-6 py-3 font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone || '-'}</TableCell>
                  <TableCell>{c.email || '-'}</TableCell>
                  <TableCell className="text-right px-6">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setFormData({ id: c.id, name: c.name, phone: c.phone || '', email: c.email || '' })
                      setDialogOpen(true)
                    }}>
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.name)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{formData.id ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap *</label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telepon</label>
                <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
