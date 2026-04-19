import Link from 'next/link'
import { formatEventCount } from '@/lib/search'
import RecallBadge from './RecallBadge'
import TrendBadge from './TrendBadge'
import CompareToggleButton from './CompareToggleButton'
import type { Manufacturer } from '@/lib/types'

interface ManufacturerCardProps {
  manufacturer: Manufacturer
}

export default function ManufacturerCard({ manufacturer: m }: ManufacturerCardProps) {
  return (
    <Link
      href={`/manufacturer/${encodeURIComponent(m.id)}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{m.name}</p>
          <p className="text-xs text-gray-400">{m.country}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <RecallBadge tier={m.risk_tier} size="sm" />
          <CompareToggleButton id={m.id} type="manufacturer" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="text-xs text-gray-400">Total Events</p>
          <p className="font-bold text-gray-800">{formatEventCount(m.total_events)}</p>
        </div>
        <div>
          <p className="text-xs text-red-400">Deaths</p>
          <p className="font-bold text-red-600">{formatEventCount(m.death_count)}</p>
        </div>
        <div>
          <p className="text-xs text-orange-400">Injuries</p>
          <p className="font-bold text-orange-600">{formatEventCount(m.injury_count)}</p>
        </div>
      </div>

      <div className="mt-2">
        <TrendBadge trend={m.projected_event_rate_trend} size="sm" />
      </div>
    </Link>
  )
}
