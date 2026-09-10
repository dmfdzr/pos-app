'use client'

import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
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
    <>
      {/* Fullscreen Loading Overlay saat logout */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-primary">Mengakhiri sesi...</p>
          </div>
        </div>
      )}

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
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Keluar...
              </>
            ) : textLogout}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
