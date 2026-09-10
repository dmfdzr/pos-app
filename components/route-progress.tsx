'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function RouteProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsNavigating(false), 50)
    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href]')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      if (target.getAttribute('target') === '_blank') return
      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return
        if (url.pathname === window.location.pathname && url.search === window.location.search) return
        setIsNavigating(true)
      } catch {
        return
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (!isNavigating) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5 bg-transparent">
      <div className="h-full w-full origin-left animate-[route-progress_1s_ease-in-out_infinite] bg-primary" />
      <div className="fixed inset-0 flex items-start justify-center pt-20 pointer-events-none">
        <div className="flex items-center gap-2 rounded-full border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">Memuat halaman...</span>
        </div>
      </div>
    </div>
  )
}

export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressInner />
    </Suspense>
  )
}
