import clsx from 'clsx'
import { recallRateLabel } from '@/lib/search'
import type { RiskTier } from '@/lib/types'

interface RecallBadgeProps {
  /** Use `rate` (0–1) to auto-derive the label, or `tier` to supply it directly. */
  rate?: number
  tier?: RiskTier
  count?: number
  size?: 'sm' | 'md'
}

const TIER_LABEL: Record<RiskTier, string> = {
  HIGH:   'High',
  MEDIUM: 'Moderate',
  LOW:    'Low',
}

export default function RecallBadge({ rate, tier, count, size = 'md' }: RecallBadgeProps) {
  let label: string
  if (tier) {
    label = TIER_LABEL[tier]
  } else if (rate !== undefined) {
    label = recallRateLabel(rate)
  } else {
    label = 'Unknown'
  }

  const colorMap: Record<string, string> = {
    High:     'bg-red-100 text-red-700 ring-red-300',
    Moderate: 'bg-orange-100 text-orange-700 ring-orange-300',
    Low:      'bg-green-100 text-green-700 ring-green-300',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset',
        colorMap[label] ?? 'bg-gray-100 text-gray-600 ring-gray-300',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      <span
        className={clsx(
          'inline-block rounded-full',
          label === 'High'     && 'bg-red-500',
          label === 'Moderate' && 'bg-orange-400',
          label === 'Low'      && 'bg-green-500',
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
        )}
      />
      {/* sm cards: show only tier label; md: show full "X Recall Risk" */}
      {size === 'sm' ? label : `${label} Recall Risk`}
      {count !== undefined && size !== 'sm' && (
        <span className="ml-1 opacity-70">({count} recalls)</span>
      )}
    </span>
  )
}
