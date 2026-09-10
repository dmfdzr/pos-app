'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }
  redirect('/dashboard')
}

export async function register(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const storeName = formData.get('storeName') as string

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }

  if (data.user) {
    // Admin client to bypass RLS
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Create store
    const { data: store, error: storeError } = await adminSupabase
      .from('stores')
      .insert({ nama_toko: storeName })
      .select()
      .single()
      
    if (storeError) return { error: storeError.message }

    // Create profile
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: data.user.id,
        store_id: store.id,
        role: 'OWNER',
        full_name: email.split('@')[0]
      })
      
    if (profileError) return { error: profileError.message }
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
