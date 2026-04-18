'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format, parse, addMonths, subMonths } from 'date-fns'
import type { EventRateTrend } from '@/lib/types'

interface EventTrendChartProps {
  eventsByMonth: Record<string, number>
  title?: string
  trend?: EventRateTrend
  projectMonths?: number
}

interface ChartPoint {
  month: string
  events?: number
  projected?: number
}

type Timeframe = 1 | 3 | 6 | 12 | 'all'
const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: '1M',  value: 1 },
  { label: '3M',  value: 3 },
  { label: '6M',  value: 6 },
  { label: '12M', value: 12 },
  { label: 'All', value: 'all' },
]

function filterByTimeframe(
  eventsByMonth: Record<string, number>,
  timeframe: Timeframe,
): Record<string, number> {
  if (timeframe === 'all') return eventsByMonth
  const sorted = Object.keys(eventsByMonth).sort()
  if (sorted.length === 0) return {}
  const lastKey  = sorted[sorted.length - 1]
  const lastDate = parse(lastKey, 'yyyy-MM', new Date())
  // Use `timeframe` months back (not timeframe-1) so "1M" shows the last real
  // month of data + context. Enforce minimum 2 months so a line can render.
  const months  = Math.max(timeframe, 2)
  const cutoff  = format(subMonths(lastDate, months - 1), 'yyyy-MM')
  return Object.fromEntries(Object.entries(eventsByMonth).filter(([k]) => k >= cutoff))
}

function toChartData(
  eventsByMonth: Record<string, number>,
  trend: EventRateTrend = 'UNKNOWN',
  projectMonths = 3,
): ChartPoint[] {
  const sorted = Object.entries(eventsByMonth).sort(([a], [b]) => a.localeCompare(b))
  if (sorted.length === 0) return []

  const historical: ChartPoint[] = sorted.map(([key, events]) => {
    const date = parse(key, 'yyyy-MM', new Date())
    return { month: format(date, 'MMM yy'), events }
  })

  if (trend === 'UNKNOWN' || projectMonths === 0) return historical

  const recent4 = sorted.slice(-4).map(([, v]) => v)
  const empiricalRates: number[] = []
  for (let i = 1; i < recent4.length; i++) {
    if (recent4[i - 1] > 0) empiricalRates.push((recent4[i] - recent4[i - 1]) / recent4[i - 1])
  }
  const trendPrior =
    trend === 'INCREASING' ? 0.04 : trend === 'DECREASING' ? -0.04 : 0.005
  const empirical =
    empiricalRates.length > 0
      ? empiricalRates.reduce((a, b) => a + b, 0) / empiricalRates.length
      : trendPrior
  const growthRate = Math.max(-0.20, Math.min(0.20, empirical * 0.6 + trendPrior * 0.4))

  const lastKey   = sorted[sorted.length - 1][0]
  const lastDate  = parse(lastKey, 'yyyy-MM', new Date())
  const lastValue = sorted[sorted.length - 1][1]

  historical[historical.length - 1].projected = lastValue

  const projections: ChartPoint[] = Array.from({ length: projectMonths }, (_, i) => {
    const projDate  = addMonths(lastDate, i + 1)
    const projected = Math.max(0, Math.round(lastValue * Math.pow(1 + growthRate, i + 1)))
    return { month: format(projDate, 'MMM yy'), projected }
  })

  return [...historical, ...projections]
}

export default function EventTrendChart({
  eventsByMonth,
  title = 'Events per Month',
  trend = 'UNKNOWN',
  projectMonths = 3,
}: EventTrendChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>(12)

  const filtered      = filterByTimeframe(eventsByMonth, timeframe)
  const data          = toChartData(filtered, trend, projectMonths)
  const hasProjection = trend !== 'UNKNOWN' && projectMonths > 0
  const splitMonth    = data.findLast?.((d) => d.events !== undefined)?.month
  const actualPoints  = data.filter((d) => d.events !== undefined).length
  const showDots      = actualPoints <= 3  // show dots when line is too short to read

  const timeframeLabel = timeframe === 'all' ? 'All Time'
    : timeframe === 1 ? 'Last Month'
    : `Last ${timeframe} Months`

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">{title} <span className="font-normal text-gray-400">· {timeframeLabel}</span></h3>
        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  timeframe === tf.value
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          {hasProjection && (
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 bg-blue-500" />
                Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-blue-300" />
                Projected
              </span>
            </div>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name === 'projected' ? 'Projected events' : 'Events',
            ]}
          />
          {hasProjection && splitMonth && (
            <ReferenceLine
              x={splitMonth}
              stroke="#d1d5db"
              strokeDasharray="4 2"
              label={{ value: 'Last data', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="events"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={showDots ? { r: 4, fill: '#3b82f6' } : false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
          {hasProjection && (
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#93c5fd"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 3 }}
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
