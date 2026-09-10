import { createClient } from "@/utils/supabase/server"
import { getLocale } from "@/lib/i18n/actions"
import { AppSidebar } from "@/components/app-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()

  let profile = null
  let lowStockCount = 0

  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data

    // Low stock count for badge: pastikan filter store_id jika bukan SUPERADMIN
    if (profile) {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', 5)

      if (profile.role !== 'SUPERADMIN' && profile.store_id) {
        query = query.eq('store_id', profile.store_id)
      }

      const { count } = await query
      lowStockCount = count || 0
    }
  }

  return (
    <AppSidebar 
      profile={profile} 
      userEmail={user?.email || ''} 
      lowStockCount={lowStockCount} 
      locale={locale} 
    >
      {children}
    </AppSidebar>
  )
}
