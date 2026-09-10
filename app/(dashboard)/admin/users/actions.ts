'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserRoleAndStore(formData: FormData) {
  const supabase = await createClient()
  
  // Verify superadmin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'SUPERADMIN') return { error: 'Unauthorized' }

  const profileId = formData.get('profile_id') as string
  const role = formData.get('role') as string
  const storeId = formData.get('store_id') as string

  if (!profileId) return { error: 'Profile ID is required' }

  const updateData: Record<string, string | null> = { role }
  if (storeId === 'NULL' || storeId === '') {
    updateData.store_id = null
  } else {
    updateData.store_id = storeId
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', profileId)

  if (error) return { error: error.message }
  
  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { success: true }
}
