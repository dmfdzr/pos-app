import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, ArrowRight, TrendingUp, Receipt, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getLocale } from "@/lib/i18n/actions"
import { dictionaries } from "@/lib/i18n/dictionaries"
import { formatRupiah } from "@/lib/format"
import { RevenueChart } from "@/components/revenue-chart"
import { StoreFilter } from "@/components/store-filter"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function DashboardPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  const storeIdParam = typeof searchParams?.store_id === 'string' ? searchParams.store_id : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const locale = await getLocale()
  const dict = dictionaries[locale]

  const { data: profile } = await supabase.from('profiles').select('*, store:stores(nama_toko)').eq('id', user.id).single()

  let stores: { id: string; nama_toko: string }[] = []
  if (profile?.role === 'SUPERADMIN') {
    const { data: storesData } = await supabase.from('stores').select('id, nama_toko').order('nama_toko')
    stores = storesData || []
  }

  // ---- Metrics ----
  // Today's start timestamp in ISO
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Setup queries
  let queryProductsCount = supabase.from('products').select('*', { count: 'exact', head: true })
  let queryTodayTxns = supabase.from('transactions').select('total_amount, created_at').gte('created_at', todayStart.toISOString())
  let queryLowStock = supabase.from('products').select('id, name, stock_quantity').lt('stock_quantity', 5).order('stock_quantity', { ascending: true }).limit(5)
  let queryLast7Days = supabase.from('transactions').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('created_at')
  
  // Note: transaction_items doesn't have store_id. But transactions does. 
  // Wait, transaction_items joins with transactions. We can't filter transaction_items easily by store_id without a join.
  // We can filter transactions and then get items, but for now we'll do a join or leave it global for top items.
  // Let's use inner join on transaction_items to filter by store_id if needed.
  let queryTopItems = supabase.from('transaction_items').select('product_name, quantity, transactions!inner(store_id)').order('quantity', { ascending: false }).limit(20)

  if (profile?.role === 'SUPERADMIN' && storeIdParam) {
    queryProductsCount = queryProductsCount.eq('store_id', storeIdParam)
    queryTodayTxns = queryTodayTxns.eq('store_id', storeIdParam)
    queryLowStock = queryLowStock.eq('store_id', storeIdParam)
    queryLast7Days = queryLast7Days.eq('store_id', storeIdParam)
    queryTopItems = queryTopItems.eq('transactions.store_id', storeIdParam)
  }

  const [
    { count: productCount },
    { data: todayTxns },
    { data: lowStockProducts },
    { data: last7daysTxns },
    { data: topItems },
  ] = await Promise.all([
    queryProductsCount,
    queryTodayTxns,
    queryLowStock,
    queryLast7Days,
    queryTopItems,
  ])

  const todayRevenue = todayTxns?.reduce((s, t) => s + t.total_amount, 0) || 0
  const todayCount = todayTxns?.length || 0

  // Build 7-day chart data
  const dayMap: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short' })
    dayMap[key] = 0
  }
  last7daysTxns?.forEach(tx => {
    const key = new Date(tx.created_at).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short' })
    if (dayMap[key] !== undefined) dayMap[key] += tx.total_amount
  })
  const chartData = Object.entries(dayMap).map(([date, revenue]) => ({ date, revenue }))

  // Top products (aggregate by name)
  const topProductMap: Record<string, number> = {}
  topItems?.forEach(item => {
    topProductMap[item.product_name] = (topProductMap[item.product_name] || 0) + item.quantity
  })
  const topProducts = Object.entries(topProductMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {dict.dashboard.welcome}, {profile?.full_name || user.email}!
          </h1>
          <p className="text-muted-foreground mt-2">
            {dict.dashboard.storeStatus}{' '}
            <span className="font-semibold text-foreground">
              {profile?.role === 'SUPERADMIN' 
                ? (storeIdParam ? stores.find(s => s.id === storeIdParam)?.nama_toko : 'Semua Toko (Global)') 
                : (profile?.store?.nama_toko || 'Toko Anda')}
            </span>{' '}
            {dict.dashboard.today}.
          </p>
        </div>
        {profile?.role === 'SUPERADMIN' && (
          <StoreFilter stores={stores} />
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-md shadow-lg border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{dict.dashboard.todayRevenue}</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatRupiah(todayRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{dict.dashboard.today}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md shadow-lg border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{dict.dashboard.todayTransactions}</CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{dict.dashboard.today}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md shadow-lg border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{dict.dashboard.totalProducts}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{dict.dashboard.registeredCatalog}</p>
          </CardContent>
        </Card>

        <Card className={`backdrop-blur-md shadow-lg border ${(lowStockProducts?.length || 0) > 0 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-card/50 border-border/50'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{dict.dashboard.lowStockAlert}</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${(lowStockProducts?.length || 0) > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(lowStockProducts?.length || 0) > 0 ? 'text-orange-500' : ''}`}>
              {lowStockProducts?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{dict.dashboard.lowStockDesc}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Top Products */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{dict.dashboard.revenueChart}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.every(d => d.revenue === 0) ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                {dict.dashboard.noTransactionYet}
              </div>
            ) : (
              <RevenueChart data={chartData} label={dict.dashboard.todayRevenue} />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{dict.dashboard.topProducts}</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-muted-foreground text-sm py-12 text-center">{dict.dashboard.noTransactionYet}</div>
            ) : (
              <div className="space-y-3">
                {topProducts.map(([name, qty], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs w-4 font-bold">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{name}</div>
                      <div className="text-xs text-muted-foreground">{qty} terjual</div>
                    </div>
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.max(20, (qty / topProducts[0][1]) * 80)}px` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stok Menipis */}
      {(lowStockProducts?.length || 0) > 0 && (
        <Card className="bg-orange-500/5 border-orange-500/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              {dict.dashboard.lowStockAlert}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {lowStockProducts?.map(p => (
                <Link key={p.id} href="/inventory" className="flex items-center justify-between p-2 bg-orange-500/10 rounded-lg hover:bg-orange-500/20 transition-colors">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <span className="ml-2 text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0">{p.stock_quantity}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
