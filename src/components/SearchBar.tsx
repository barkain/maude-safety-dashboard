'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { search } from '@/lib/search'
import { formatEventCount } from '@/lib/search'
import type { SearchResult } from '@/lib/types'

interface SearchBarProps {
  initialValue?: string
  onSelect?: (result: SearchResult) => void
  autoFocus?: boolean
}

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function SearchBar({
  initialValue = '',
  onSelect,
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery]         = useState(initialValue)
  const [results, setResults]     = useState<SearchResult[]>([])
  const [loading, setLoading]     = useState(false)
  const [open, setOpen]           = useState(false)
  const debounced                 = useDebounce(query, 300)
  const containerRef              = useRef<HTMLDivElement>(null)
  const router                    = useRouter()

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await search(q)
      setResults(res.slice(0, 8))
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchResults(debounced) }, [debounced, fetchResults])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(result: SearchResult) {
    setOpen(false)
    if (onSelect) { onSelect(result); return }
    const path =
      result.kind === 'manufacturer'
        ? `/manufacturer/${encodeURIComponent(result.data.id)}`
        : `/device/${encodeURIComponent(result.data.id)}`
    router.push(path)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (results.length > 0) handleSelect(results[0])
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                transform="scale(0.9) translate(1,1)" />
              <circle cx="9" cy="9" r="5" strokeWidth={1.8} />
              <path d="m15 15 3 3" strokeLinecap="round" strokeWidth={1.8} />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search devices, manufacturers…"
            autoFocus={autoFocus}
            className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {loading && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          )}
        </div>
      </form>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {results.map((r, i) => {
            const isManufacturer = r.kind === 'manufacturer'
            const label  = isManufacturer ? r.data.name : `${r.data.brand_name} — ${r.data.generic_name}`
            const sub    = isManufacturer
              ? `Manufacturer · ${formatEventCount(r.data.total_events)} events`
              : `Device · ${r.data.manufacturer_name} · ${formatEventCount(r.data.total_events)} events`
            return (
              <li key={i}>
                <button
                  onMouseDown={() => handleSelect(r)}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                >
                  <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold uppercase ${
                    isManufacturer
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {isManufacturer ? 'M' : 'D'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{label}</p>
                    <p className="truncate text-xs text-gray-400">{sub}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
