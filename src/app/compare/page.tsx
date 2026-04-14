import type { Metadata } from 'next'
import Link from 'next/link'
import { getManufacturer, getDevice } from '@/lib/firestore'
import type { Manufacturer, Device } from '@/lib/types'
import CompareTable from '@/components/CompareTable'
import MultiEntityTrendChart from '@/components/MultiEntityTrendChart'

export const metadata: Metadata = {
  title: 'Compare — FDA MAUDE Dashboard',
}

interface Props {
  searchParams: { ids?: string; type?: string }
}

export default async function ComparePage({ searchParams }: Props) {
  const rawIds = (searchParams.ids ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const type   = searchParams.type === 'device' ? 'device' : 'manufacturer'

  // Fetch all entities in parallel
  const entities: Array<Manufacturer | Device> = (
    await Promise.all(
      rawIds.map((id) =>
        type === 'device' ? getDevice(id) : getManufacturer(id),
      ),
    )
  ).filter((e): e is Manufacturer | Device => e !== null)

  const entityLabel = type === 'device' ? 'Device' : 'Manufacturer'
  const n           = entities.length

  // Build series for the overlay trend chart
  const series = entities.map((e) => ({
    id:            e.id,
    name:          'name' in e ? e.name : e.brand_name,
    eventsByMonth: e.events_by_month,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Comparing {n} {entityLabel}{n !== 1 ? 's' : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Side-by-side safety metrics for selected {entityLabel.toLowerCase()}s
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-brand-600 hover:underline"
        >
          ← Back to search
        </Link>
      </div>

      {/* ── Empty state ── */}
      {entities.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No entities found for the provided IDs.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
            Return to home
          </Link>
        </div>
      )}

      {/* ── Compare table ── */}
      {entities.length > 0 && (
        <>
          <section className="mb-6">
            <h2 className="mb-3 text-base font-semibold text-gray-800">Metrics Comparison</h2>
            <CompareTable entities={entities} />
          </section>

          {/* ── Overlay trend chart ── */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-800">
              Event Rate Trends (Last 12 Months)
            </h2>
            {series.some((s) => Object.keys(s.eventsByMonth).length > 0) ? (
              <MultiEntityTrendChart
                series={series}
                title="Monthly Adverse Events — All Selected"
              />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
                No monthly trend data available for selected entities.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
