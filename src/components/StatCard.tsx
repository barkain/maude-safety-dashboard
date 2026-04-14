import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue'
  className?: string
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'border-t-brand-500',
  red:     'border-t-red-500',
  orange:  'border-t-orange-500',
  yellow:  'border-t-yellow-500',
  green:   'border-t-green-500',
  blue:    'border-t-blue-500',
}

export default function StatCard({
  label,
  value,
  sub,
  accent = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-200 bg-white p-4 shadow-sm border-t-4',
        accentMap[accent],
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
