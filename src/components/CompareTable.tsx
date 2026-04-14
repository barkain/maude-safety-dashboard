import type { Manufacturer, Device } from '@/lib/types'
import TrendBadge from './TrendBadge'

type Entity = Manufacturer | Device

// ── helpers ───────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

/** Return Tailwind classes for the worst (red) / best (green) / middle (gray). */
function rankColor(rank: 'worst' | 'mid' | 'best'): string {
  if (rank === 'worst') return 'bg-red-50 text-red-700 font-bold'
  if (rank === 'best')  return 'bg-green-50 text-green-700 font-bold'
  return 'text-gray-700'
}

/** Given an array of numeric values and whether higher = worse, compute ranks per entity. */
function rankValues(
  values: (number | null)[],
  higherIsWorse: boolean,
): Array<'worst' | 'mid' | 'best'> {
  const defined = values.filter((v): v is number => v !== null)
  if (defined.length < 2) return values.map(() => 'mid')

  const max = Math.max(...defined)
  const min = Math.min(...defined)

  return values.map((v) => {
    if (v === null) return 'mid'
    if (higherIsWorse) {
      if (v === max) return 'worst'
      if (v === min) return 'best'
    } else {
      if (v === max) return 'best'
      if (v === min) return 'worst'
    }
    return 'mid'
  })
}

// ── row definitions ───────────────────────────────────────────────────────────

type RowDef = {
  label: string
  getValue: (e: Entity) => number | null
  format: (n: number) => string
  higherIsWorse: boolean
}

const ROWS: RowDef[] = [
  {
    label:         'Total Events',
    getValue:      (e) => e.total_events,
    format:        formatNum,
    higherIsWorse: true,
  },
  {
    label:         'Deaths',
    getValue:      (e) => e.death_count,
    format:        formatNum,
    higherIsWorse: true,
  },
  {
    label:         'Recall Rate',
    getValue:      (e) => e.recall_rate,
    format:        pct,
    higherIsWorse: true,
  },
  {
    label:         'Severity Score',
    getValue:      (e) => e.severity_score,
    format:        (n) => `${n}/100`,
    higherIsWorse: true,
  },
]

// ── component ─────────────────────────────────────────────────────────────────

interface CompareTableProps {
  entities: Entity[]
}

function getEntityName(e: Entity): string {
  if ('name' in e) return e.name            // Manufacturer
  return e.brand_name                        // Device
}

export default function CompareTable({ entities }: CompareTableProps) {
  if (entities.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full min-w-max border-collapse bg-white text-sm">
        {/* Column headers — one per entity */}
        <thead>
          <tr className="border-b border-gray-200">
            <th className="w-36 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Metric
            </th>
            {entities.map((e) => (
              <th
                key={e.id}
                className="px-4 py-3 text-center text-xs font-semibold text-gray-800"
              >
                {getEntityName(e)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Numeric rows */}
          {ROWS.map((row) => {
            const values = entities.map((e) => row.getValue(e))
            const ranks  = rankValues(values, row.higherIsWorse)

            return (
              <tr key={row.label} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5 text-xs text-gray-500">{row.label}</td>
                {entities.map((e, i) => {
                  const val = values[i]
                  return (
                    <td
                      key={e.id}
                      className={`px-4 py-2.5 text-center text-sm ${rankColor(ranks[i])}`}
                    >
                      {val !== null ? row.format(val) : '—'}
                    </td>
                  )
                })}
              </tr>
            )
          })}

          {/* Risk tier row */}
          <tr className="border-b border-gray-100">
            <td className="px-4 py-2.5 text-xs text-gray-500">Risk Tier</td>
            {entities.map((e) => {
              const tierColors: Record<string, string> = {
                HIGH:   'bg-red-100 text-red-700',
                MEDIUM: 'bg-yellow-100 text-yellow-700',
                LOW:    'bg-green-100 text-green-700',
              }
              const tier = e.risk_tier ?? 'UNKNOWN'
              return (
                <td key={e.id} className="px-4 py-2.5 text-center">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                      tierColors[tier] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {tier}
                  </span>
                </td>
              )
            })}
          </tr>

          {/* Event rate trend row */}
          <tr>
            <td className="px-4 py-2.5 text-xs text-gray-500">Event Rate Trend</td>
            {entities.map((e) => (
              <td key={e.id} className="px-4 py-2.5 text-center">
                <TrendBadge trend={e.projected_event_rate_trend ?? 'UNKNOWN'} size="sm" />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
