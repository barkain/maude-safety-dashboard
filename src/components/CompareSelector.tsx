'use client'

import { useCompareState } from '@/hooks/useCompareState'

interface CompareSelectorProps {
  id: string
  name: string
  type: 'manufacturer' | 'device'
}

export const COMPARE_STORAGE_KEY  = 'maude_compare_ids'
export const COMPARE_TYPE_KEY     = 'maude_compare_type'
export const COMPARE_CHANGE_EVENT = 'maude_compare_change'

export function readCompareIds(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) ?? '[]') } catch { return [] }
}

export function readCompareType(): 'manufacturer' | 'device' | null {
  if (typeof window === 'undefined') return null
  const t = localStorage.getItem(COMPARE_TYPE_KEY)
  return t === 'manufacturer' || t === 'device' ? t : null
}

export function writeCompareIds(ids: string[], type?: 'manufacturer' | 'device'): void {
  localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids))
  if (type) localStorage.setItem(COMPARE_TYPE_KEY, type)
  if (ids.length === 0) localStorage.removeItem(COMPARE_TYPE_KEY)
  window.dispatchEvent(new Event(COMPARE_CHANGE_EVENT))
}

export default function CompareSelector({ id, type }: CompareSelectorProps) {
  const { isSelected, typeMismatch, atMax, toggle } = useCompareState(id, type)

  return (
    <button
      onClick={toggle}
      disabled={atMax}
      title={
        typeMismatch ? `Currently comparing ${type}s — click to start a new comparison`
        : atMax      ? 'Maximum 4 items for comparison'
        : undefined
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
        isSelected
          ? 'border-brand-400 bg-brand-50 text-brand-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
          : typeMismatch
          ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
          : atMax
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
          : 'border-brand-300 bg-white text-brand-700 hover:bg-brand-50'
      }`}
    >
      {isSelected ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
          Added to comparison
        </>
      ) : typeMismatch ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          New comparison
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          {atMax ? 'Max reached' : 'Add to comparison'}
        </>
      )}
    </button>
  )
}
