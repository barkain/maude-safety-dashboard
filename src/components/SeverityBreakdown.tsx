'use client'

interface SeverityBreakdownProps {
  deathCount: number
  injuryCount: number
  malfunctionCount: number
  title?: string
}

const ROWS = [
  { label: 'Deaths',       key: 'deaths',       color: 'bg-red-500',    text: 'text-red-700'    },
  { label: 'Injuries',     key: 'injuries',     color: 'bg-orange-400', text: 'text-orange-700' },
  { label: 'Malfunctions', key: 'malfunctions', color: 'bg-amber-400',  text: 'text-amber-700'  },
]

export default function SeverityBreakdown({
  deathCount,
  injuryCount,
  malfunctionCount,
  title = 'Event Breakdown',
}: SeverityBreakdownProps) {
  const counts = [deathCount, injuryCount, malfunctionCount]
  const total  = counts.reduce((a, b) => a + b, 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>

      {total === 0 ? (
        <p className="text-center text-sm text-gray-400">No event data</p>
      ) : (
        <div className="space-y-3">
          {ROWS.map((row, i) => {
            const count = counts[i]
            const pct   = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={row.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-600">{row.label}</span>
                  <span className={`font-semibold ${row.text}`}>
                    {count.toLocaleString()}
                    <span className="ml-1 font-normal text-gray-400">
                      ({pct.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${row.color} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, pct > 0 ? 0.5 : 0)}%` }}
                  />
                </div>
              </div>
            )
          })}

          {/* Total */}
          <div className="mt-3 border-t border-gray-100 pt-3 text-right text-xs text-gray-400">
            Total: <span className="font-semibold text-gray-600">{total.toLocaleString()}</span> events
          </div>
        </div>
      )}
    </div>
  )
}
