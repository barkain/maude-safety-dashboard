'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MaudeEvent } from '@/app/api/events/route'

interface Problem {
  problem: string
  count:   number
}

interface Props {
  problems:        Problem[]
  productCode?:    string
  manufacturerName?: string
}

const EVENT_TYPE_CLASS: Record<string, string> = {
  Death:       'bg-red-100 text-red-700',
  Injury:      'bg-orange-100 text-orange-700',
  Malfunction: 'bg-yellow-100 text-yellow-700',
}

function EventCard({ ev }: { ev: MaudeEvent }) {
  const cls = EVENT_TYPE_CLASS[ev.eventType] ?? 'bg-gray-100 text-gray-700'
  const fdaUrl = `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/detail.cfm?mdrfoi__id=${ev.reportNumber.replace(/[^0-9]/g, '')}`

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${cls}`}>{ev.eventType}</span>
        <span className="text-gray-400">{ev.date}</span>
        {ev.outcomes.length > 0 && (
          <span className="text-gray-500">· {ev.outcomes.slice(0, 2).join(', ')}</span>
        )}
        <a
          href={fdaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-brand-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          FDA report ↗
        </a>
      </div>
      {ev.description && (
        <p className="mt-2 text-xs leading-relaxed text-gray-600">{ev.description}</p>
      )}
    </div>
  )
}

export default function ProblemEventsPanel({ problems, productCode, manufacturerName }: Props) {
  const [selected,  setSelected]  = useState<string | null>(null)
  const [events,    setEvents]    = useState<MaudeEvent[]>([])
  const [total,     setTotal]     = useState(0)
  const [skip,      setSkip]      = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const fetchEvents = useCallback(async (problem: string, nextSkip: number) => {
    setLoading(true)
    setError('')
    const p = new URLSearchParams({ problem, skip: String(nextSkip) })
    if (productCode)     p.set('productCode', productCode)
    if (manufacturerName) p.set('manufacturerName', manufacturerName)

    try {
      const res  = await fetch(`/api/events?${p}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'API error')
      if (nextSkip === 0) {
        setEvents(data.events ?? [])
      } else {
        setEvents((prev) => [...prev, ...(data.events ?? [])])
      }
      setTotal(data.total ?? 0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [productCode, manufacturerName])

  function openProblem(problem: string) {
    setSelected(problem)
    setSkip(0)
    setEvents([])
    setTotal(0)
    fetchEvents(problem, 0)
  }

  function close() {
    setSelected(null)
    setEvents([])
    setError('')
  }

  function loadMore() {
    if (!selected) return
    const next = skip + 10
    setSkip(next)
    fetchEvents(selected, next)
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* ── Problem list ── */}
      <ol className="space-y-2">
        {problems.map((p, i) => (
          <li key={i}>
            <button
              onClick={() => openProblem(p.problem)}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:shadow-md text-left group"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-gray-700 group-hover:text-brand-800">{p.problem}</span>
              {p.count != null && (
                <span className="text-xs text-gray-400">{p.count} reports</span>
              )}
              <svg className="h-3.5 w-3.5 text-gray-300 group-hover:text-brand-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </li>
        ))}
      </ol>

      {/* ── Slide-over panel ── */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl sm:max-w-lg">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Reported Problem</p>
                <h2 className="mt-0.5 text-base font-bold text-gray-900 leading-snug">{selected}</h2>
                {total > 0 && (
                  <p className="mt-0.5 text-xs text-gray-400">{total.toLocaleString()} FDA reports found</p>
                )}
              </div>
              <button
                onClick={close}
                className="ml-4 shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Disclaimer */}
            <div className="border-b border-gray-100 bg-amber-50 px-5 py-2.5">
              <p className="text-[10px] text-amber-700">
                Live data from the FDA MAUDE database. Reports are submitted by manufacturers, healthcare providers, and patients — FDA has not evaluated each report.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loading && events.length === 0 && (
                <div className="flex items-center justify-center py-16">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!loading && !error && events.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">
                  No specific event reports found for this problem.
                </div>
              )}

              {events.map((ev) => (
                <EventCard key={ev.reportNumber} ev={ev} />
              ))}

              {/* Load more */}
              {events.length < total && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-200 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : `Load more (${total - events.length} remaining)`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
