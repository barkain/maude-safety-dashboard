import type { Metadata } from 'next'
import { getTopManufacturers, getTopDevices, getHighRiskManufacturers, getHighRiskDevices } from '@/lib/firestore'
import HomeSearch from '@/components/HomeSearch'
import type { Manufacturer, Device } from '@/lib/types'

export const metadata: Metadata = {
  title: 'FDA MAUDE Dashboard — Medical Device Safety',
}

/** Strip Firestore Timestamp (non-serializable) before passing to client component */
function strip<T extends { last_updated?: unknown }>(items: T[]): Omit<T, 'last_updated'>[] {
  return items.map(({ last_updated: _lt, ...rest }) => rest)
}

export default async function HomePage() {
  const [topMfrs, topDevices, highRiskMfrs, highRiskDevices] = await Promise.all([
    getTopManufacturers(6),
    getTopDevices(6),
    getHighRiskManufacturers(3),
    getHighRiskDevices(3),
  ])

  return (
    <HomeSearch
      topMfrs={strip(topMfrs) as Omit<Manufacturer, 'last_updated'>[]}
      topDevices={strip(topDevices) as Omit<Device, 'last_updated'>[]}
      highRiskMfrs={strip(highRiskMfrs) as Omit<Manufacturer, 'last_updated'>[]}
      highRiskDevices={strip(highRiskDevices) as Omit<Device, 'last_updated'>[]}
    />
  )
}
