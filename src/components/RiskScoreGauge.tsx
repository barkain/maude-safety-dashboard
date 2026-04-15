interface RiskScoreGaugeProps {
  /** Score between 0 and 10 */
  score: number
  label?: string
  className?: string
  /** Override the tier label (HIGH/MEDIUM/LOW) instead of computing from score */
  overrideTier?: string
}

function getTierStyle(tier: string): { color: string; barColor: string } {
  if (tier === 'HIGH')   return { color: 'text-red-700',    barColor: 'bg-red-500'    }
  if (tier === 'MEDIUM') return { color: 'text-yellow-700', barColor: 'bg-yellow-400' }
  return                        { color: 'text-green-700',  barColor: 'bg-green-500'  }
}

function computeTier(score: number): string {
  if (score >= 6) return 'HIGH'
  if (score >= 3) return 'MEDIUM'
  return 'LOW'
}

export default function RiskScoreGauge({
  score,
  label = 'Supply Chain Risk',
  className = '',
  overrideTier,
}: RiskScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(10, score))
  const pct     = (clamped / 10) * 100
  const tier    = overrideTier ?? computeTier(clamped)
  const { color, barColor } = getTierStyle(tier)

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className={`text-sm font-bold ${color}`}>
          {clamped.toFixed(1)} / 10 &mdash; {tier}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
        {/* Gradient background zones */}
        <div
          className="absolute inset-y-0 left-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        >
          {/* Color gradient from green → yellow → red based on position */}
          <div className={`h-full w-full rounded-full ${barColor} opacity-90`} />
        </div>
        {/* Zone markers */}
        <div className="pointer-events-none absolute inset-0 flex">
          <div className="w-[30%] border-r border-white/60" />
          <div className="w-[30%] border-r border-white/60" />
        </div>
      </div>

      {/* Scale labels */}
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>0 — Low</span>
        <span>3</span>
        <span>6</span>
        <span>10 — High</span>
      </div>
    </div>
  )
}
