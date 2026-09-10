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

    // Low stock count for badge
    if (profile) {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', 5)
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
