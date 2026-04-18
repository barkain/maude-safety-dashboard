import type { Metadata } from 'next'
import Link from 'next/link'
import { getTopRiskManufacturers, getTopRiskDevices } from '@/lib/firestore'
import type { Manufacturer, Device } from '@/lib/types'
import RiskLeaderboard from '@/components/RiskLeaderboard'

export const metadata: Metadata = {
  title: 'Recall Risk Leaderboard — FDA MAUDE Dashboard',
}

function strip<T extends { last_updated?: unknown }>(items: T[]): Omit<T, 'last_updated'>[] {
  return items.map(({ last_updated: _lt, ...rest }) => rest)
}

export default async function RiskPage() {
  const [mfrs, devices] = await Promise.all([
    getTopRiskManufacturers(60),
    getTopRiskDevices(60),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-xs text-gray-400">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900">Recall Risk Leaderboard</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
          Recall Risk Leaderboard
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Manufacturers and devices ranked by predicted recall probability.
          Scores are derived from adverse event patterns, recall history, and severity distribution.
        </p>
      </div>

      <RiskLeaderboard
        manufacturers={strip(mfrs) as Omit<Manufacturer, 'last_updated'>[]}
        devices={strip(devices) as Omit<Device, 'last_updated'>[]}
      />
    </div>
  )
}
