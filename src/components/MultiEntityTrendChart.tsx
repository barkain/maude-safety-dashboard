'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, parse } from 'date-fns'

interface SeriesData {
  id:            string
  name:          string
  eventsByMonth: Record<string, number>
}

interface MultiEntityTrendChartProps {
  series: SeriesData[]
  title?: string
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
]

function mergeMonths(series: SeriesData[]): Array<Record<string, string | number>> {
  // Collect all month keys
  const keySet = new Set<string>()
  series.forEach((s) => Object.keys(s.eventsByMonth).forEach((k) => keySet.add(k)))
  const sortedKeys = Array.from(keySet).sort()

  return sortedKeys.map((key) => {
    const date  = parse(key, 'yyyy-MM', new Date())
    const label = format(date, 'MMM yy')
    const row: Record<string, string | number> = { month: label }
    series.forEach((s) => {
      row[s.id] = s.eventsByMonth[key] ?? 0
    })
    return row
  })
}

export default function MultiEntityTrendChart({
  series,
  title = 'Event Trends',
}: MultiEntityTrendChartProps) {
  const data = mergeMonths(series)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
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
            formatter={(value: number, key: string) => {
              const s = series.find((x) => x.id === key)
              return [value.toLocaleString(), s?.name ?? key]
            }}
          />
          <Legend
            formatter={(value) => {
              const s = series.find((x) => x.id === value)
              return s?.name ?? value
            }}
            wrapperStyle={{ fontSize: 11 }}
          />
          {series.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
