import Link from 'next/link'
import { formatEventCount } from '@/lib/search'
import RecallBadge from './RecallBadge'
import TrendBadge from './TrendBadge'
import type { Device } from '@/lib/types'

interface DeviceCardProps {
  device: Device
}

const classColors: Record<string, string> = {
  'Class I':   'bg-green-100 text-green-700',
  'Class II':  'bg-blue-100 text-blue-700',
  'Class III': 'bg-red-100 text-red-700',
}

export default function DeviceCard({ device }: DeviceCardProps) {
  const cls = classColors[device.device_class] ?? 'bg-gray-100 text-gray-700'

  return (
    <Link
      href={`/device/${device.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{device.brand_name}</p>
          <p className="truncate text-sm text-gray-500">{device.generic_name}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
          {device.device_class}
        </span>
      </div>

      <p className="mt-1 text-xs text-gray-400">{device.manufacturer_name}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="text-center">
          <p className="text-xs text-gray-400">Events</p>
          <p className="font-bold text-gray-800">{formatEventCount(device.total_events)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-red-400">Deaths</p>
          <p className="font-bold text-red-600">{formatEventCount(device.death_count)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-orange-400">Injuries</p>
          <p className="font-bold text-orange-600">{formatEventCount(device.injury_count)}</p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <RecallBadge tier={device.risk_tier} size="sm" />
        </div>
      </div>

      <div className="mt-2">
        <TrendBadge trend={device.projected_event_rate_trend} size="sm" />
      </div>
    </Link>
  )
}
