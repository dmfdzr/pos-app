import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"
import { createStore } from "./actions"
import { ArrowLeft, Store } from "lucide-react"
import Link from "next/link"

export default async function AdminStoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  if (profile?.role !== 'SUPERADMIN') {
    redirect('/dashboard') // Unauthorized
  }

  const { data: stores } = await supabase.from('stores').select('*').order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="outline" size="icon" className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="bg-primary/10 p-3 rounded-full">
          <Store className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground mt-1">Manage physical stores and tenants</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur-md shadow-xl border-border/50 h-fit">
          <CardHeader>
            <CardTitle>Create New Tenant</CardTitle>
            <CardDescription>Add a new store to the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* @ts-ignore - server action return type is compatible at runtime */}
            <form action={createStore} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Store Name</label>
                <Input name="nama_toko" required placeholder="e.g. Serenity Branch 1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input name="alamat" placeholder="Street name..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input name="telepon" placeholder="08..." />
              </div>
              <Button type="submit" className="w-full">Create Store</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader>
            <CardTitle>Registered Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores?.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.nama_toko}</TableCell>
                    <TableCell className="text-muted-foreground">{store.alamat || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{store.telepon || '—'}</TableCell>
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
      </div>
    </div>
  )
}
