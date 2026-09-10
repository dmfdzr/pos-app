'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useDictionary } from '@/lib/i18n/use-dictionary'
import { Store, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type StoreData = {
  id: string
  nama_toko: string
  alamat: string | null
  telepon: string | null
  npwp: string | null
}

export default function SettingsPage() {
  const supabase = createClient()
  const dict = useDictionary()

  const [store, setStore] = useState<StoreData | null>(null)
  const [form, setForm] = useState({ nama_toko: '', alamat: '', telepon: '', npwp: '', tax_rate: '0' })
  const [userRole, setUserRole] = useState<string>('OWNER')
  const [adminForm, setAdminForm] = useState({ full_name: '' })
  const [adminEmail, setAdminEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setAdminEmail(user.email || '')
      
      const { data: profile } = await supabase.from('profiles').select('store_id, role, full_name').eq('id', user.id).single()
      if (profile) {
        setUserRole(profile.role)
        setAdminForm({ full_name: profile.full_name || '' })
      }
      
      if (!profile?.store_id) return
      
      const { data: storeData } = await supabase.from('stores').select('*').eq('id', profile.store_id).single()
      if (storeData) {
        setStore(storeData)
        setForm({
          nama_toko: storeData.nama_toko || '',
          alamat: storeData.alamat || '',
          telepon: storeData.telepon || '',
          npwp: storeData.npwp || '',
          tax_rate: storeData.tax_rate?.toString() || '0',
        })
      }
    }
    load()
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return
    setLoading(true)
    setError(null)
    setSaved(false)

    const { error: updateError } = await supabase.from('stores').update({
      nama_toko: form.nama_toko,
      alamat: form.alamat || null,
      telepon: form.telepon || null,
      npwp: form.npwp || null,
      tax_rate: parseFloat(form.tax_rate) || 0,
    }).eq('id', store.id)

    setLoading(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const handleAdminSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateError } = await supabase.from('profiles').update({
      full_name: adminForm.full_name,
    }).eq('id', user.id)

    setLoading(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{userRole === 'SUPERADMIN' ? 'Pengaturan Akun' : dict.settings.title}</h1>
      </div>

      {userRole === 'SUPERADMIN' ? (
        <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Profil Superadmin</CardTitle>
                <CardDescription>Informasi akun admin Anda.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <form onSubmit={handleAdminSave} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <Input
                  required
                  value={adminForm.full_name}
                  onChange={e => setAdminForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Super Admin"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email (Login)</label>
                <Input
                  value={adminEmail}
                  disabled
                  className="h-10 bg-muted/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Email tidak dapat diubah dari sini.</p>
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  {error}
                </div>
              )}

              {saved && (
                <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {dict.settings.savedSuccess}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-10">
                {loading ? dict.common.saving : dict.settings.saveChanges}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{dict.settings.title}</CardTitle>
                  <CardDescription>Informasi ini akan muncul pada struk transaksi pelanggan.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{dict.settings.storeName} *</label>
                  <Input
                    required
                    value={form.nama_toko}
                    onChange={e => setForm(f => ({ ...f, nama_toko: e.target.value }))}
                    placeholder="Contoh: Toko Sinar Jaya"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{dict.settings.address}</label>
                  <Input
                    value={form.alamat}
                    onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
                    placeholder="Jl. Raya No. 123, Jakarta"
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{dict.settings.phone}</label>
                    <Input
                      type="tel"
                      value={form.telepon}
                      onChange={e => setForm(f => ({ ...f, telepon: e.target.value }))}
                      placeholder="0812-3456-7890"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{dict.settings.npwp}</label>
                    <Input
                      value={form.npwp}
                      onChange={e => setForm(f => ({ ...f, npwp: e.target.value }))}
                      placeholder="00.000.000.0-000.000"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Persentase Pajak / PPN (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.tax_rate}
                    onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                    placeholder="Contoh: 11"
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">Pajak akan otomatis dihitung saat transaksi POS. Isi 0 jika tidak ada pajak.</p>
                </div>

                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                    {error}
                  </div>
                )}

                {saved && (
                  <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {dict.settings.savedSuccess}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-10">
                  {loading ? dict.common.saving : dict.settings.saveChanges}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preview Struk */}
          <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{dict.settings.receiptPreview}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-xs bg-muted/50 rounded-lg p-4 space-y-1 max-w-xs mx-auto border">
                <div className="text-center font-bold text-sm">{form.nama_toko || 'Nama Toko'}</div>
                {form.alamat && <div className="text-center text-muted-foreground">{form.alamat}</div>}
                {form.telepon && <div className="text-center text-muted-foreground">Telp: {form.telepon}</div>}
                {form.npwp && <div className="text-center text-muted-foreground">NPWP: {form.npwp}</div>}
                <div className="border-t border-dashed my-2 pt-2">
                  <div className="flex justify-between"><span>Aqua 600ml x2</span><span>Rp 10.000</span></div>
                  <div className="flex justify-between"><span>Indomie Goreng</span><span>Rp 3.500</span></div>
                </div>
                <div className="border-t border-dashed my-1 pt-1">
                  <div className="flex justify-between font-bold"><span>TOTAL</span><span>Rp 13.500</span></div>
                </div>
                <div className="text-center text-muted-foreground pt-1">Terima kasih sudah berbelanja!</div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
