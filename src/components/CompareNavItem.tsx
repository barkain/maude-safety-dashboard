'use client'

import { useEffect, useState } from 'react'
import { readCompareIds, readCompareType, COMPARE_CHANGE_EVENT } from './CompareSelector'

export default function CompareNavItem() {
  const [count, setCount] = useState(0)
  const [type,  setType]  = useState<'manufacturer' | 'device' | null>(null)

  function sync() {
    setCount(readCompareIds().length)
    setType(readCompareType())
  }

  useEffect(() => {
    sync()
    window.addEventListener(COMPARE_CHANGE_EVENT, sync)
    return () => window.removeEventListener(COMPARE_CHANGE_EVENT, sync)
  }, [])

  const href = count >= 2
    ? `/compare?ids=${readCompareIds().map(encodeURIComponent).join('|')}&type=${type ?? 'manufacturer'}`
    : '/compare'

  return (
    <a
      href={href}
      className="relative inline-flex items-center gap-1.5 font-medium text-gray-500 hover:text-brand-600 transition-colors"
    >
      Compare
      {count > 0 && (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </a>
  )
}
