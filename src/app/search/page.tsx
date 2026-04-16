'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { formatEventCount } from '@/lib/search'
import type { SearchResult } from '@/lib/types'

function RiskBadge({ tier }: { tier?: string }) {
  const cls =
    tier === 'HIGH'   ? 'bg-red-100 text-red-700'    :
    tier === 'medium' ? 'bg-yellow-100 text-yellow-700' :
    tier === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      {tier ?? 'LOW'}
    </span>
  )
}

function ResultCard({ result }: { result: SearchResult }) {
  const isManufacturer = result.kind === 'manufacturer'
  const d = result.data
  const name = isManufacturer ? (d as { name: string }).name : (d as { brand_name: string }).brand_name
  const sub  = isManufacturer
    ? `Manufacturer`
    : `${(d as { manufacturer_name: string }).manufacturer_name} — ${(d as { generic_name: string }).generic_name}`
  const href = isManufacturer
    ? `/manufacturer/${encodeURIComponent(d.id)}`
    : `/device/${encodeURIComponent(d.id)}`

  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              isManufacturer ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {isManufacturer ? 'Mfr' : 'Device'}
            </span>
            <RiskBadge tier={d.risk_tier} />
          </div>
          <p className="mt-1.5 font-semibold text-gray-900 leading-snug">{name}</p>
          <p className="mt-0.5 text-xs text-gray-400 truncate">{sub}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-gray-500 space-y-1">
          <div><span className="font-semibold text-gray-800">{formatEventCount(d.total_events)}</span> events</div>
          {d.death_count > 0 && (
            <div className="text-red-600 font-semibold">{formatEventCount(d.death_count)} deaths</div>
          )}
          <div>{formatEventCount(d.recall_count)} recalls</div>
        </div>
      </div>
    </Link>
  )
}

function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const [results, setResults]   = useState<SearchResult[]>([])
  const [summary, setSummary]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [nlEnabled, setNlEnabled] = useState(false)

  useEffect(() => {
    if (!q) return
    setLoading(true)
    fetch(`/api/nl-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results ?? [])
        setSummary(data.summary ?? '')
        setNlEnabled(!!data.intent)
      })
      .finally(() => setLoading(false))
  }, [q])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-xs text-brand-600 hover:underline">← Back to search</Link>
        <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Search Results</h1>

        {/* NL interpretation banner */}
        {summary && !loading && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
            {nlEnabled && (
              <span className="shrink-0 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                AI
              </span>
            )}
            <p className="text-sm text-brand-800">{summary}</p>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      )}

      {/* Empty */}
      {!loading && results.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No results found for <span className="font-semibold">"{q}"</span></p>
          <Link href="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
            Try a different search
          </Link>
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <>
          <p className="mb-4 text-xs text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((r, i) => <ResultCard key={i} result={r} />)}
          </div>
        </>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    }>
      <SearchResults />
    </Suspense>
  )
}
