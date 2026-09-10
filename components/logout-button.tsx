'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { logout } from '@/app/login/actions'

export function LogoutButton({ 
  textLogout = 'Keluar', 
  textConfirm = 'Yakin ingin keluar?', 
  textCancel = 'Batal' 
}: { 
  textLogout?: string, 
  textConfirm?: string, 
  textCancel?: string 
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await logout()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-2 text-muted-foreground hover:text-destructive" })}>
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">{textLogout}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{textLogout}</DialogTitle>
          <DialogDescription>
            {textConfirm}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {textCancel}
          </Button>
          <Button variant="destructive" onClick={handleLogout} disabled={loading}>
            {loading ? '...' : textLogout}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
