'use server'

import { cookies } from 'next/headers'
import { type Locale } from './dictionaries'

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, { path: '/' })
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value as Locale
  return locale === 'en' ? 'en' : 'id' // Default to id
}
