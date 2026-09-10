'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ShoppingCart, ShieldAlert, User, BarChart3, Settings, AlertTriangle, Menu, X, LayoutDashboard } from 'lucide-react'
import { useDictionary } from '@/lib/i18n/use-dictionary'
import { LanguageToggle } from '@/components/language-toggle'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'

interface AppSidebarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any> | null
  userEmail: string
  lowStockCount: number
  locale: string
  children: React.ReactNode
}

export function AppSidebar({ profile, userEmail, lowStockCount, locale, children }: AppSidebarProps) {
  const dict = useDictionary()
  const pathname = usePathname()
  
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isDesktopOpen, setIsDesktopOpen] = useState(true)

  const navLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: dict.nav.dashboard, roles: ['CASHIER', 'OWNER', 'SUPERADMIN'] },
    { href: '/pos', icon: ShoppingCart, label: dict.nav.pos, roles: ['CASHIER', 'OWNER'] },
    { href: '/inventory', icon: Package, label: dict.nav.inventory, roles: ['CASHIER', 'OWNER', 'SUPERADMIN'], badge: lowStockCount },
    { href: '/customers', icon: User, label: 'Pelanggan', roles: ['OWNER', 'SUPERADMIN'] },
    { href: '/reports', icon: BarChart3, label: dict.nav.reports, roles: ['CASHIER', 'OWNER', 'SUPERADMIN'] },
    { href: '/settings', icon: Settings, label: dict.nav.settings, roles: ['OWNER', 'SUPERADMIN'] },
    { href: '/admin', icon: ShieldAlert, label: dict.nav.adminPanel, roles: ['SUPERADMIN'], textClass: 'text-destructive' },
  ]

  const activeRole = profile?.role || 'CASHIER'
  const visibleLinks = navLinks.filter(link => link.roles.includes(activeRole))

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card border-r border-border shadow-xl transform transition-transform duration-300 ease-in-out print:hidden
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
          ${isDesktopOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo.jpg" alt="StockFlow" className="h-7 w-7 rounded-md object-cover shadow-sm" />
            <span className="text-primary text-xl font-bold tracking-tight">StockFlow POS</span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {visibleLinks.map((link) => {
            const isActive = pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard')
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${link.textClass || ''}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''} ${link.textClass || ''}`} />
                {link.label}
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center h-5 px-2 rounded-full bg-green-600 dark:bg-green-500 text-white text-[10px] font-bold shadow-sm">
                    {link.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="md:hidden p-4 border-t border-border bg-muted/20">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || userEmail}</p>
              <p className="text-xs text-muted-foreground truncate">{activeRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full ${isDesktopOpen ? 'md:pl-72' : 'md:pl-0'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 backdrop-blur px-4 shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            {/* Mobile Toggle */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
            {/* Desktop Toggle */}
            <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setIsDesktopOpen(!isDesktopOpen)}>
              <Menu className="h-6 w-6" />
            </Button>
            
            {/* Show title on mobile, or on desktop if sidebar is closed */}
            <div className={`flex items-center gap-2 ml-2 ${isDesktopOpen ? 'md:hidden' : 'hidden md:flex'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo.jpg" alt="StockFlow" className="h-6 w-6 rounded-md object-cover" />
              <span className="text-primary font-bold">StockFlow POS</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {lowStockCount > 0 && activeRole !== 'CASHIER' && (
              <Link href="/inventory" className="relative" title="Stok Kritis">
                <AlertTriangle className="h-5 w-5 text-green-600 dark:text-green-500" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 dark:bg-green-500 text-[10px] font-bold text-white shadow-sm">
                  {lowStockCount}
                </span>
              </Link>
            )}

            {/* User Identity - Desktop Only */}
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <User className="h-3.5 w-3.5" />
              <span>{profile?.full_name || userEmail}</span>
              {activeRole === 'SUPERADMIN' && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive text-destructive-foreground uppercase tracking-wide">
                  Admin
                </span>
              )}
            </div>

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <LanguageToggle currentLocale={locale as any} />
            <LogoutButton textLogout={dict.nav.logout} textConfirm={dict.nav.confirmLogout} textCancel={dict.common.cancel} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 print:p-0 print:bg-white print:text-black w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
