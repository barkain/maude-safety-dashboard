'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import ManufacturerCard from './ManufacturerCard'
import DeviceCard from './DeviceCard'
import StatCard from './StatCard'
import type { Manufacturer, Device, SearchResult } from '@/lib/types'

const NL_EXAMPLES = [
  'insulin pump high recall risk',
  'cardiac devices with deaths',
  'Medtronic',
  'respiratory manufacturer',
]

const HEADLINE_STATS = [
  { label: 'Total Events (2024-25)', value: '600K+',   sub: 'MAUDE reports analysed',         accent: 'blue'    },
  { label: 'Manufacturers Tracked',  value: '2,086',   sub: 'Unique reporting entities',       accent: 'green'   },
  { label: 'Device Types',           value: '5,555',   sub: 'Across all product codes',        accent: 'default' },
  { label: 'High Risk Entities',     value: '181',     sub: 'Flagged for procurement review',  accent: 'orange'  },
] as const

// Timestamps are stripped on the server before serialization
type SerialMfr    = Omit<Manufacturer, 'last_updated'>
type SerialDevice = Omit<Device, 'last_updated'>

interface Props {
  topMfrs:        SerialMfr[]
  topDevices:     SerialDevice[]
  highRiskMfrs:   SerialMfr[]
  highRiskDevices: SerialDevice[]
}

export default function HomeSearch({ topMfrs, topDevices, highRiskMfrs, highRiskDevices }: Props) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [summary, setSummary] = useState('')
  const [isAI, setIsAI]       = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  // Pick up ?q= from URL on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) { setQuery(q); doSearch(q) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) { setResults(null); setSummary(''); return }
    setLoading(true)
    setResults(null)
    window.history.replaceState({}, '', `/?q=${encodeURIComponent(trimmed)}`)
    try {
      const res  = await fetch(`/api/nl-search?q=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setSummary(data.summary ?? '')
      setIsAI(!!data.intent)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    doSearch(query)
  }

  function handleChip(ex: string) {
    setQuery(ex)
    doSearch(ex)
  }

  function handleClear() {
    setQuery('')
    setResults(null)
    setSummary('')
    window.history.replaceState({}, '', '/')
    inputRef.current?.focus()
  }

  const hasResults = results !== null

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            FDA MAUDE Data — 2024–2025
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
            Medical Device Adverse&nbsp;Event Dashboard
          </h1>
          <p className="mt-4 text-base text-brand-100 sm:text-lg">
            Search 600,000+ FDA MAUDE reports. Evaluate device safety, compare
            manufacturers, and assess supply chain risk — all in one place.
          </p>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="mt-8 mx-auto max-w-xl">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <circle cx="9" cy="9" r="5" strokeWidth={1.8} />
                  <path d="m15 15 3 3" strokeLinecap="round" strokeWidth={1.8} />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search devices, manufacturers, or ask in plain English…"
                autoFocus
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-28 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                {hasResults && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          {/* Example chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-brand-200">Try:</span>
            {NL_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => handleChip(ex)}
                className="rounded-full bg-white/15 px-3 py-1 text-xs text-white transition hover:bg-white/25"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {/* ── Headline stats — always visible ── */}
        <section className="-mt-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {HEADLINE_STATS.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                sub={s.sub}
                accent={s.accent as 'default' | 'blue' | 'green' | 'orange'}
                className="shadow-md"
              />
            ))}
          </div>
        </section>

        {/* ── Loading ── */}
        {loading && (
          <div className="mt-16 flex flex-col items-center gap-3 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            <p className="text-sm">Searching…</p>
          </div>
        )}

        {/* ── Search results ── */}
        {!loading && hasResults && (
          <section className="mt-10">
            {/* AI intent banner */}
            {summary && (
              <div className="mb-5 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
                {isAI && (
                  <span className="shrink-0 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    AI
                  </span>
                )}
                <p className="text-sm text-brand-800">{summary}</p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="ml-auto shrink-0 text-xs text-brand-500 hover:text-brand-800"
                >
                  Clear
                </button>
              </div>
            )}

            {results!.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <p className="text-gray-500">
                  No results found for <span className="font-semibold">"{query}"</span>
                </p>
                <button
                  onClick={handleClear}
                  className="mt-4 text-sm text-brand-600 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs text-gray-400">
                  {results!.length} result{results!.length !== 1 ? 's' : ''}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results!.map((r, i) =>
                    r.kind === 'manufacturer' ? (
                      <ManufacturerCard key={i} manufacturer={r.data as Manufacturer} />
                    ) : (
                      <DeviceCard key={i} device={r.data as Device} />
                    )
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Default content (no active search) ── */}
        {!loading && !hasResults && (
          <>
            {/* Risk Watch */}
            {(highRiskMfrs.length > 0 || highRiskDevices.length > 0) && (
              <section className="mt-12">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <h2 className="text-lg font-bold text-gray-900">Risk Watch</h2>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">HIGH risk</span>
                  <span className="ml-auto text-xs text-gray-400">Flagged by supply chain risk score</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {highRiskMfrs.map((m) => <ManufacturerCard key={m.id} manufacturer={m as Manufacturer} />)}
                  {highRiskDevices.map((d) => <DeviceCard key={d.id} device={d as Device} />)}
                </div>
                <div className="mt-3 text-right">
                  <button
                    onClick={() => handleChip('high risk manufacturer')}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    View all high-risk entities →
                  </button>
                </div>
              </section>
            )}

            {/* Top Manufacturers */}
            <section className="mt-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Top Manufacturers by Events</h2>
                <span className="text-xs text-gray-400">Ranked by total adverse event reports</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topMfrs.map((m) => <ManufacturerCard key={m.id} manufacturer={m as Manufacturer} />)}
              </div>
            </section>

            {/* Top Devices */}
            <section className="mt-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Top Devices by Events</h2>
                <span className="text-xs text-gray-400">Ranked by total adverse event reports</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topDevices.map((d) => <DeviceCard key={d.id} device={d as Device} />)}
              </div>
            </section>

            {/* About */}
            <section className="mt-12 rounded-2xl border border-brand-100 bg-brand-50 px-6 py-6">
              <h3 className="font-semibold text-brand-900">What is MAUDE?</h3>
              <p className="mt-1 text-sm text-brand-700">
                The FDA&apos;s Medical Device Adverse Event Reporting system (MAUDE) collects mandatory
                reports from manufacturers, importers, and device user facilities, plus voluntary
                reports from health professionals and consumers. This dashboard aggregates and
                visualises that data to support procurement decisions, regulatory research, and
                patient safety analysis.
              </p>
            </section>
          </>
        )}
      </div>
    </>
  )
}
