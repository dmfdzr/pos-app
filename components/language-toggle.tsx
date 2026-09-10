'use client'

import { useRouter } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Languages } from 'lucide-react'
import { setLocale } from '@/lib/i18n/actions'
import { type Locale } from '@/lib/i18n/dictionaries'
import { useTransition } from 'react'

export function LanguageToggle({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSetLocale = (locale: Locale) => {
    startTransition(async () => {
      await setLocale(locale)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })} disabled={isPending}>
        <Languages className="h-5 w-5" />
        <span className="sr-only">Toggle language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleSetLocale('id')}
          className={currentLocale === 'id' ? 'font-bold' : ''}
        >
          🇮🇩 Indonesia
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleSetLocale('en')}
          className={currentLocale === 'en' ? 'font-bold' : ''}
        >
          🇺🇸 English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
