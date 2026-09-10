'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createStore(formData: FormData) {
  const supabase = await createClient()
  
  // Verify superadmin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'SUPERADMIN') return { error: 'Unauthorized' }

  const nama_toko = formData.get('nama_toko') as string
  const alamat = formData.get('alamat') as string
  const telepon = formData.get('telepon') as string

  if (!nama_toko) return { error: 'Nama Toko is required' }

  const { error } = await supabase.from('stores').insert({
    nama_toko,
    alamat,
    telepon
  })

  if (error) return { error: error.message }
  
  revalidatePath('/admin/stores')
  revalidatePath('/admin')
  return { success: true }
}
