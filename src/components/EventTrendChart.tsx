'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parse } from 'date-fns'
import type { MonthlyDataPoint } from '@/lib/types'

interface EventTrendChartProps {
  eventsByMonth: Record<string, number>
  title?: string
}

function toChartData(eventsByMonth: Record<string, number>): MonthlyDataPoint[] {
  return Object.entries(eventsByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, events]) => {
      const date = parse(key, 'yyyy-MM', new Date())
      return { month: format(date, 'MMM yy'), events }
    })
}

export default function EventTrendChart({
  eventsByMonth,
  title = 'Events per Month',
}: EventTrendChartProps) {
  const data = toChartData(eventsByMonth)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
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
            formatter={(value: number) => [value.toLocaleString(), 'Events']}
          />
          <Line
            type="monotone"
            dataKey="events"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
