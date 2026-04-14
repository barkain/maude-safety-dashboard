import { searchManufacturers, searchDevices } from './firestore'
import type { SearchResult } from './types'

export async function search(queryStr: string): Promise<SearchResult[]> {
  if (!queryStr.trim()) return []

  const [mfrs, devices] = await Promise.all([
    searchManufacturers(queryStr),
    searchDevices(queryStr),
  ])

  const results: SearchResult[] = [
    ...mfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
    ...devices.map((d) => ({ kind: 'device'       as const, data: d })),
  ]

  // Sort by total_events descending so most-reported entities appear first
  results.sort((a, b) => b.data.total_events - a.data.total_events)

  return results
}

export function formatEventCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function severityColor(score: number): string {
  if (score >= 75) return 'text-red-600'
  if (score >= 50) return 'text-orange-500'
  if (score >= 25) return 'text-yellow-500'
  return 'text-green-600'
}

export function recallRateLabel(rate: number): string {
  if (rate >= 0.35) return 'High'
  if (rate >= 0.15) return 'Moderate'
  return 'Low'
}
