'use client'

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
import { format, parse, addMonths } from 'date-fns'
import type { MonthlyDataPoint, EventRateTrend } from '@/lib/types'

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

function toChartData(
  eventsByMonth: Record<string, number>,
  trend: EventRateTrend = 'UNKNOWN',
  projectMonths = 3,
): ChartPoint[] {
  const sorted = Object.entries(eventsByMonth).sort(([a], [b]) => a.localeCompare(b))
  if (sorted.length === 0) return []

  // Historical points
  const historical: ChartPoint[] = sorted.map(([key, events]) => {
    const date = parse(key, 'yyyy-MM', new Date())
    return { month: format(date, 'MMM yy'), events }
  })

  if (trend === 'UNKNOWN' || projectMonths === 0) return historical

  // Derive growth rate from actual month-over-month data (last 4 months)
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
  // Blend 60% empirical + 40% trend-label prior; cap at ±20%/month
  const growthRate = Math.max(-0.20, Math.min(0.20, empirical * 0.6 + trendPrior * 0.4))

  // Last real date to start projecting from
  const lastKey = sorted[sorted.length - 1][0]
  const lastDate = parse(lastKey, 'yyyy-MM', new Date())
  const lastValue = sorted[sorted.length - 1][1]

  // Bridge: last historical point carries both events and projected (ensures visual continuity)
  historical[historical.length - 1].projected = lastValue

  // Project from lastValue (not avgRecent) to avoid visual jump at the bridge point
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
  const data = toChartData(eventsByMonth, trend, projectMonths)
  const hasProjection = trend !== 'UNKNOWN' && projectMonths > 0
  // Index where projection starts (last historical point)
  const splitMonth = data.findLast?.((d) => d.events !== undefined)?.month

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
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
          {/* Divider between actual and projected */}
          {hasProjection && splitMonth && (
            <ReferenceLine
              x={splitMonth}
              stroke="#d1d5db"
              strokeDasharray="4 2"
              label={{ value: 'Last data', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
            />
          )}
          {/* Actual line */}
          <Line
            type="monotone"
            dataKey="events"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
          {/* Projected line — dashed */}
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
