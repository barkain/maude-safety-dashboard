import type { EventRateTrend } from '@/lib/types'

interface TrendBadgeProps {
  trend: EventRateTrend
  size?: 'sm' | 'md'
}

const TREND_CONFIG: Record<
  EventRateTrend,
  { icon: string; label: string; classes: string }
> = {
  INCREASING: {
    icon:    '↑',
    label:   'Increasing',
    classes: 'bg-red-100 text-red-700 ring-red-300',
  },
  STABLE: {
    icon:    '→',
    label:   'Stable',
    classes: 'bg-gray-100 text-gray-600 ring-gray-300',
  },
  DECREASING: {
    icon:    '↓',
    label:   'Decreasing',
    classes: 'bg-green-100 text-green-700 ring-green-300',
  },
  UNKNOWN: {
    icon:    '?',
    label:   'Unknown',
    classes: 'bg-gray-100 text-gray-400 ring-gray-200',
  },
}

export default function TrendBadge({ trend, size = 'md' }: TrendBadgeProps) {
  const { icon, label, classes } = TREND_CONFIG[trend] ?? TREND_CONFIG.UNKNOWN
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset ${classes} ${sizeClasses}`}
    >
      <span>{icon}</span>
      {label}
    </span>
  )
}
