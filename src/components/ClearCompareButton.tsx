'use client'

import { useRouter } from 'next/navigation'
import { writeCompareIds } from './CompareSelector'

export default function ClearCompareButton() {
  const router = useRouter()

  function clearAll() {
    writeCompareIds([], undefined)
    router.push('/')
  }

  return (
    <button
      onClick={clearAll}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50"
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Clear all
    </button>
  )
}
