import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, Store, Users } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  if (profile?.role !== 'SUPERADMIN') {
    redirect('/dashboard') // Unauthorized
  }

  // Fetch all stores and profiles
  const { data: stores } = await supabase.from('stores').select('*').order('created_at', { ascending: false })
  const { data: profiles } = await supabase.from('profiles').select('*, store:stores(nama_toko)').order('role')

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-destructive/10 p-3 rounded-full">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-destructive">Superadmin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Global system management and tenant oversight.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants (Stores)</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stores?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Registered Stores</CardTitle>
              <CardDescription>List of all tenants in the system.</CardDescription>
            </div>
            <Link href="/admin/stores">
              <Button variant="outline" size="sm">Manage Stores</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores?.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.nama_toko}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(store.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>System Users</CardTitle>
              <CardDescription>List of all user profiles across all stores.</CardDescription>
            </div>
            <Link href="/admin/users">
              <Button variant="outline" size="sm">Manage Users</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead>User / Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Store</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={p.role === 'SUPERADMIN' ? 'destructive' : 'default'}>
                        {p.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.store?.nama_toko}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}
