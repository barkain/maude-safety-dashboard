'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { formatEventCount } from '@/lib/search'
import CompareToggleButton from '@/components/CompareToggleButton'
import type { SearchResult } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type TypeFilter  = 'all' | 'manufacturer' | 'device'
type RiskFilter  = 'all' | 'HIGH' | 'MEDIUM' | 'LOW'
type SortField   = 'events' | 'deaths' | 'recalls' | 'risk'

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ tier }: { tier?: string }) {
  const cls =
    tier === 'HIGH'   ? 'bg-red-100 text-red-700'      :
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
  const d    = result.data
  const name = isManufacturer ? (d as { name: string }).name : (d as { brand_name: string }).brand_name
  const sub  = isManufacturer
    ? `Manufacturer · ${(d as { country?: string }).country ?? ''}`
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
        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right text-xs text-gray-500 space-y-1">
            <div><span className="font-semibold text-gray-800">{formatEventCount(d.total_events)}</span> events</div>
            {d.death_count > 0 && (
              <div className="text-red-600 font-semibold">{formatEventCount(d.death_count)} deaths</div>
            )}
            <div>{d.recall_count} recall{d.recall_count !== 1 ? 's' : ''}</div>
          </div>
          <CompareToggleButton id={d.id} type={isManufacturer ? 'manufacturer' : 'device'} />
        </div>
      </div>
    </Link>
  )
}

// ── Pill button helper ────────────────────────────────────────────────────────

function Pill({
  active,
  onClick,
  children,
  color = 'brand',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  color?: 'brand' | 'red' | 'yellow' | 'green'
}) {
  const activeClasses =
    color === 'red'    ? 'bg-red-600 text-white border-red-600'      :
    color === 'yellow' ? 'bg-yellow-500 text-white border-yellow-500' :
    color === 'green'  ? 'bg-green-600 text-white border-green-600'   :
                         'bg-brand-600 text-white border-brand-600'
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? activeClasses
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

// ── Main search results component ─────────────────────────────────────────────

function SearchResults() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const q            = searchParams.get('q') ?? ''

  // Filter/sort state (synced to URL)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>((searchParams.get('type') as TypeFilter) ?? 'all')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>((searchParams.get('risk') as RiskFilter) ?? 'all')
  const [sortField,  setSortField]  = useState<SortField>((searchParams.get('sort') as SortField)   ?? 'events')

  // Raw API results
  const [allResults, setAllResults] = useState<SearchResult[]>([])
  const [summary,    setSummary]    = useState('')
  const [loading,    setLoading]    = useState(true)
  const [nlEnabled,  setNlEnabled]  = useState(false)

  // ── Sync filters to URL ──────────────────────────────────────────────────────
  const updateUrl = useCallback(
    (t: TypeFilter, r: RiskFilter, s: SortField) => {
      const p = new URLSearchParams({ q })
      if (t !== 'all')    p.set('type', t)
      if (r !== 'all')    p.set('risk', r)
      if (s !== 'events') p.set('sort', s)
      router.replace(`/search?${p.toString()}`, { scroll: false })
    },
    [q, router],
  )

  function setType(v: TypeFilter)  { setTypeFilter(v); updateUrl(v, riskFilter, sortField) }
  function setRisk(v: RiskFilter)  { setRiskFilter(v); updateUrl(typeFilter, v, sortField) }
  function setSort(v: SortField)   { setSortField(v);  updateUrl(typeFilter, riskFilter, v) }

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!q) return
    setLoading(true)
    fetch(`/api/nl-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setAllResults(data.results ?? [])
        setSummary(data.summary ?? '')
        setNlEnabled(!!data.intent)
      })
      .finally(() => setLoading(false))
  }, [q])

  // ── Client-side filter + sort ────────────────────────────────────────────────
  const results = useMemo(() => {
    let r = allResults

    // Type filter
    if (typeFilter === 'manufacturer') r = r.filter((x) => x.kind === 'manufacturer')
    if (typeFilter === 'device')       r = r.filter((x) => x.kind === 'device')

    // Risk filter
    if (riskFilter !== 'all') r = r.filter((x) => x.data.risk_tier === riskFilter)

    // Sort
    r = r.slice().sort((a, b) => {
      if (sortField === 'deaths')  return b.data.death_count  - a.data.death_count
      if (sortField === 'recalls') return b.data.recall_count - a.data.recall_count
      if (sortField === 'risk') {
        const ord: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        return (ord[a.data.risk_tier ?? 'LOW'] ?? 2) - (ord[b.data.risk_tier ?? 'LOW'] ?? 2)
      }
      return b.data.total_events - a.data.total_events
    })

    return r
  }, [allResults, typeFilter, riskFilter, sortField])

  // ── Counts for filter pills ──────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:          allResults.length,
    manufacturer: allResults.filter((x) => x.kind === 'manufacturer').length,
    device:       allResults.filter((x) => x.kind === 'device').length,
    HIGH:         allResults.filter((x) => x.data.risk_tier === 'HIGH').length,
    MEDIUM:       allResults.filter((x) => x.data.risk_tier === 'MEDIUM').length,
    LOW:          allResults.filter((x) => !x.data.risk_tier || x.data.risk_tier === 'LOW').length,
  }), [allResults])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-5">
        <Link href="/" className="text-xs text-brand-600 hover:underline">← Back to search</Link>
        <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
          {q ? `Results for "${q}"` : 'Search Results'}
        </h1>

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

      {/* ── Filter bar ── */}
      {!loading && allResults.length > 0 && (
        <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap gap-4">

            {/* Type filter */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Type</p>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={typeFilter === 'all'}          onClick={() => setType('all')}>
                  All ({counts.all})
                </Pill>
                <Pill active={typeFilter === 'manufacturer'} onClick={() => setType('manufacturer')}>
                  Manufacturers ({counts.manufacturer})
                </Pill>
                <Pill active={typeFilter === 'device'}       onClick={() => setType('device')}>
                  Devices ({counts.device})
                </Pill>
              </div>
            </div>

            {/* Risk filter */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Risk Tier</p>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={riskFilter === 'all'}    onClick={() => setRisk('all')}>All</Pill>
                {counts.HIGH   > 0 && <Pill active={riskFilter === 'HIGH'}   onClick={() => setRisk('HIGH')}   color="red">    HIGH ({counts.HIGH})</Pill>}
                {counts.MEDIUM > 0 && <Pill active={riskFilter === 'MEDIUM'} onClick={() => setRisk('MEDIUM')} color="yellow"> MEDIUM ({counts.MEDIUM})</Pill>}
                {counts.LOW    > 0 && <Pill active={riskFilter === 'LOW'}    onClick={() => setRisk('LOW')}    color="green">  LOW ({counts.LOW})</Pill>}
              </div>
            </div>

            {/* Sort */}
            <div className="ml-auto">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Sort by</p>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={sortField === 'events'}  onClick={() => setSort('events')}>Events</Pill>
                <Pill active={sortField === 'deaths'}  onClick={() => setSort('deaths')}>Deaths</Pill>
                <Pill active={sortField === 'recalls'} onClick={() => setSort('recalls')}>Recalls</Pill>
                <Pill active={sortField === 'risk'}    onClick={() => setSort('risk')}>Risk Tier</Pill>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && allResults.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No results found for <span className="font-semibold">"{q}"</span></p>
          <Link href="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
            Try a different search
          </Link>
        </div>
      )}

      {/* ── Filter zero state ── */}
      {!loading && allResults.length > 0 && results.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No results match the current filters.</p>
          <button
            onClick={() => { setTypeFilter('all'); setRiskFilter('all'); updateUrl('all', 'all', sortField) }}
            className="mt-3 text-sm text-brand-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Results grid ── */}
      {!loading && results.length > 0 && (
        <>
          <p className="mb-4 text-xs text-gray-400">
            {results.length} result{results.length !== 1 ? 's' : ''}
            {(typeFilter !== 'all' || riskFilter !== 'all') && (
              <span> (filtered from {allResults.length})</span>
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((r, i) => <ResultCard key={i} result={r} />)}
          </div>
        </>
      )}
    </div>
  )
}

// ── Page export ───────────────────────────────────────────────────────────────

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
