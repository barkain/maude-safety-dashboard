'use client'

import { useEffect, useState } from 'react'
import { readCompareIds, readCompareType, writeCompareIds, COMPARE_CHANGE_EVENT } from './CompareSelector'

export default function CompareBar() {
  const [ids,  setIds]  = useState<string[]>([])
  const [type, setType] = useState<'manufacturer' | 'device' | null>(null)

  function sync() {
    setIds(readCompareIds())
    setType(readCompareType())
  }

  useEffect(() => {
    sync()
    window.addEventListener(COMPARE_CHANGE_EVENT, sync)
    return () => window.removeEventListener(COMPARE_CHANGE_EVENT, sync)
  }, [])

  if (ids.length === 0) return null

  const typeLabel   = type === 'device' ? 'devices' : 'manufacturers'
  const compareUrl  = `/compare?ids=${ids.map(encodeURIComponent).join('|')}&type=${type ?? 'manufacturer'}`
  const canCompare  = ids.length >= 2

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white sm:h-7 sm:w-7">
            {ids.length}
          </span>
          <span className="truncate text-xs text-gray-700 sm:text-sm">
            <span className="font-semibold">{ids.length}</span>{' '}
            {typeLabel} selected
            {!canCompare && (
              <span className="ml-1 hidden text-gray-400 sm:inline">(add 1 more)</span>
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => writeCompareIds([])}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
          <a
            href={compareUrl}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm ${
              canCompare ? 'bg-brand-600 hover:bg-brand-700' : 'pointer-events-none bg-gray-300'
            }`}
          >
            Compare
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
