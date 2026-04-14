'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { SeveritySlice } from '@/lib/types'

interface SeverityBreakdownProps {
  deathCount: number
  injuryCount: number
  malfunctionCount: number
  title?: string
}

const COLORS = {
  Deaths:        '#dc2626',
  Injuries:      '#ea580c',
  Malfunctions:  '#ca8a04',
}

export default function SeverityBreakdown({
  deathCount,
  injuryCount,
  malfunctionCount,
  title = 'Event Breakdown',
}: SeverityBreakdownProps) {
  const data: SeveritySlice[] = [
    { name: 'Deaths',       value: deathCount,       fill: COLORS.Deaths },
    { name: 'Injuries',     value: injuryCount,      fill: COLORS.Injuries },
    { name: 'Malfunctions', value: malfunctionCount, fill: COLORS.Malfunctions },
  ].filter((d) => d.value > 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: 12,
            }}
            formatter={(value: number) => [value.toLocaleString(), '']}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
