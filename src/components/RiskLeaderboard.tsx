'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Manufacturer, Device } from '@/lib/types'
import TrendBadge from './TrendBadge'

type SerialMfr    = Omit<Manufacturer, 'last_updated'>
type SerialDevice = Omit<Device, 'last_updated'>

interface Props {
  manufacturers: SerialMfr[]
  devices:       SerialDevice[]
}

type EntityType = 'all' | 'manufacturer' | 'device'
type RiskTierFilter = 'all' | 'HIGH' | 'MEDIUM' | 'LOW'

interface Row {
  id:                 string
  name:               string
  kind:               'manufacturer' | 'device'
  recall_risk_score:  number
  risk_tier:          string
  projected_trend:    string
  total_events:       number
  death_count:        number
  recall_rate:        number
  recall_count:       number
  subtitle:           string   // specialty / device class / country
  href:               string
}

function tierColor(tier: string) {
  if (tier === 'HIGH')   return 'bg-red-100 text-red-700'
  if (tier === 'MEDIUM') return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

function scoreColor(score: number) {
  if (score >= 0.6) return 'text-red-600'
  if (score >= 0.3) return 'text-yellow-600'
  return 'text-green-600'
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function RiskLeaderboard({ manufacturers, devices }: Props) {
  const [entityType, setEntityType]   = useState<EntityType>('all')
  const [tierFilter, setTierFilter]   = useState<RiskTierFilter>('all')
  const [trendFilter, setTrendFilter] = useState<string>('all')
  const [search, setSearch]           = useState('')

  const allRows: Row[] = useMemo(() => {
    const mfrRows: Row[] = manufacturers.map((m) => ({
      id:                m.id,
      name:              m.name,
      kind:              'manufacturer',
      recall_risk_score: m.recall_risk_score ?? 0,
      risk_tier:         m.risk_tier ?? 'LOW',
      projected_trend:   m.projected_event_rate_trend ?? 'UNKNOWN',
      total_events:      m.total_events,
      death_count:       m.death_count,
      recall_rate:       m.recall_rate,
      recall_count:      m.recall_count,
      subtitle:          [m.country, ...(m.specialties?.slice(0, 2) ?? [])].filter(Boolean).join(' · '),
      href:              `/manufacturer/${encodeURIComponent(m.id)}`,
    }))

    const devRows: Row[] = devices.map((d) => ({
      id:                d.id,
      name:              d.brand_name,
      kind:              'device',
      recall_risk_score: d.recall_risk_score ?? 0,
      risk_tier:         d.risk_tier ?? 'LOW',
      projected_trend:   d.projected_event_rate_trend ?? 'UNKNOWN',
      total_events:      d.total_events,
      death_count:       d.death_count,
      recall_rate:       d.recall_rate,
      recall_count:      d.recall_count,
      subtitle:          [d.device_class, d.medical_specialty].filter(Boolean).join(' · '),
      href:              `/device/${encodeURIComponent(d.id)}`,
    }))

    return [...mfrRows, ...devRows].sort((a, b) => b.recall_risk_score - a.recall_risk_score)
  }, [manufacturers, devices])

  const filtered = useMemo(() => {
    let rows = allRows
    if (entityType !== 'all')    rows = rows.filter((r) => r.kind === entityType)
    if (tierFilter !== 'all')    rows = rows.filter((r) => r.risk_tier === tierFilter)
    if (trendFilter !== 'all')   rows = rows.filter((r) => r.projected_trend === trendFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q))
    }
    return rows
  }, [allRows, entityType, tierFilter, trendFilter, search])

  const highCount   = allRows.filter((r) => r.risk_tier === 'HIGH').length
  const medCount    = allRows.filter((r) => r.risk_tier === 'MEDIUM').length
  const risingCount = allRows.filter((r) => r.projected_trend === 'INCREASING').length

  return (
    <div>
      {/* ── Summary stats ── */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
          <p className="text-2xl font-extrabold text-red-700">{highCount}</p>
          <p className="text-xs text-red-500">High-risk entities</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-center">
          <p className="text-2xl font-extrabold text-yellow-700">{medCount}</p>
          <p className="text-xs text-yellow-600">Medium-risk entities</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-center">
          <p className="text-2xl font-extrabold text-orange-700">{risingCount}</p>
          <p className="text-xs text-orange-500">Rising event trends</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <svg className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor">
            <circle cx="9" cy="9" r="5" strokeWidth={1.8} />
            <path d="m15 15 3 3" strokeLinecap="round" strokeWidth={1.8} />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name…"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Entity type */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-semibold">
          {(['all', 'manufacturer', 'device'] as EntityType[]).map((t) => (
            <button
              key={t}
              onClick={() => setEntityType(t)}
              className={`rounded-md px-3 py-1.5 capitalize transition ${
                entityType === t ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t === 'all' ? 'All' : t === 'manufacturer' ? 'Manufacturers' : 'Devices'}
            </button>
          ))}
        </div>

        {/* Risk tier */}
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as RiskTierFilter)}
          className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-gray-600 focus:border-brand-400 focus:outline-none"
        >
          <option value="all">All tiers</option>
          <option value="HIGH">High risk</option>
          <option value="MEDIUM">Medium risk</option>
          <option value="LOW">Low risk</option>
        </select>

        {/* Trend */}
        <select
          value={trendFilter}
          onChange={(e) => setTrendFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-gray-600 focus:border-brand-400 focus:outline-none"
        >
          <option value="all">All trends</option>
          <option value="INCREASING">Rising ↑</option>
          <option value="STABLE">Stable →</option>
          <option value="DECREASING">Declining ↓</option>
        </select>

        <span className="ml-auto text-xs text-gray-400">{filtered.length} results</span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full min-w-[700px] border-collapse bg-white text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="w-10 px-4 py-3 text-xs font-semibold text-gray-400">#</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-center">Risk Score</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-center">Tier</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-center">Trend</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Events</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Deaths</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">Recalls</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                  No entities match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((row, i) => (
              <tr key={row.id} className="border-b border-gray-100 transition hover:bg-gray-50 last:border-0">
                {/* Rank */}
                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>

                {/* Name + subtitle */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                      row.kind === 'manufacturer' ? 'bg-brand-100 text-brand-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {row.kind === 'manufacturer' ? 'M' : 'D'}
                    </span>
                    <div>
                      <Link href={row.href} className="font-semibold text-gray-900 hover:text-brand-600">
                        {row.name}
                      </Link>
                      {row.subtitle && (
                        <p className="text-[10px] text-gray-400 truncate max-w-[240px]">{row.subtitle}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Risk score — bar + number */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          row.recall_risk_score >= 0.6 ? 'bg-red-500'
                          : row.recall_risk_score >= 0.3 ? 'bg-yellow-400'
                          : 'bg-green-400'
                        }`}
                        style={{ width: `${row.recall_risk_score * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${scoreColor(row.recall_risk_score)}`}>
                      {(row.recall_risk_score * 100).toFixed(0)}
                    </span>
                  </div>
                </td>

                {/* Tier badge */}
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${tierColor(row.risk_tier)}`}>
                    {row.risk_tier}
                  </span>
                </td>

                {/* Trend badge */}
                <td className="px-4 py-3 text-center">
                  <TrendBadge trend={row.projected_trend as 'INCREASING' | 'DECREASING' | 'STABLE' | 'UNKNOWN'} size="sm" />
                </td>

                {/* Numeric cols */}
                <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-600">{fmt(row.total_events)}</td>
                <td className="px-4 py-3 text-right text-xs tabular-nums">
                  <span className={row.death_count > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}>
                    {row.death_count > 0 ? fmt(row.death_count) : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs tabular-nums text-gray-600">{row.recall_count}</td>

                {/* Link arrow */}
                <td className="px-4 py-3 text-right">
                  <Link href={row.href} className="text-gray-300 hover:text-brand-500 transition-colors" aria-label="View profile">
                    →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Disclaimer ── */}
      <p className="mt-4 text-[11px] text-gray-400">
        Risk scores are derived from adverse event frequency, recall history, severity distribution, and event rate trends.
        Scores are indicative and should be used alongside professional regulatory assessment — not as a substitute for it.
      </p>
    </div>
  )
}
