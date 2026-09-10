import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { redirect } from "next/navigation"
import { updateUserRoleAndStore } from "./actions"
import { ArrowLeft, Users } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  if (profile?.role !== 'SUPERADMIN') {
    redirect('/dashboard') // Unauthorized
  }

  const { data: profiles } = await supabase.from('profiles').select('*, store:stores(nama_toko)').order('role')
  const { data: stores } = await supabase.from('stores').select('id, nama_toko').order('nama_toko')

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="outline" size="icon" className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="bg-primary/10 p-3 rounded-full">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Assign users to stores and set roles</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-md shadow-xl border-border/50">
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>All registered user profiles across all stores.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID / Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Store</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.full_name || 'No Name'}</div>
                    <div className="text-xs text-muted-foreground">{p.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.role === 'SUPERADMIN' ? 'destructive' : 'default'}>
                      {p.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.store?.nama_toko || 'No Store (Global)'}
                  </TableCell>
                  <TableCell>
                    {/* @ts-ignore - server action return type is compatible at runtime */}
                    <form action={updateUserRoleAndStore} className="flex items-center gap-2">
                      <input type="hidden" name="profile_id" value={p.id} />
                      <Select name="role" defaultValue={p.role || 'CASHIER'}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASHIER">CASHIER</SelectItem>
                          <SelectItem value="OWNER">OWNER</SelectItem>
                          <SelectItem value="SUPERADMIN">SUPERADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select name="store_id" defaultValue={p.store_id || 'NULL'}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NULL">-- No Store --</SelectItem>
                          {stores?.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.nama_toko}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button type="submit" variant="secondary" size="sm">Update</Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
