'use client'

import { useEffect, useState } from 'react'
import { dictionaries, type Dictionary } from './dictionaries'

export function useDictionary(): Dictionary {
  const [dict, setDict] = useState<Dictionary>(dictionaries.id)

  useEffect(() => {
    // Read from document.cookie
    const match = document.cookie.match(new RegExp('(^| )NEXT_LOCALE=([^;]+)'))
    const locale = (match ? match[2] : 'id') as 'en' | 'id'
    // eslint-disable-next-line
    setDict(dictionaries[locale] || dictionaries.id)
  }, [])

  return dict
}
