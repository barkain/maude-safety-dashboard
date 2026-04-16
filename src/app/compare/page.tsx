import type { Metadata } from 'next'
import Link from 'next/link'
import { getManufacturer, getDevice } from '@/lib/firestore'
import type { Manufacturer, Device } from '@/lib/types'
import CompareTable from '@/components/CompareTable'
import MultiEntityTrendChart from '@/components/MultiEntityTrendChart'
import { formatEventCount } from '@/lib/search'

export const metadata: Metadata = {
  title: 'Compare — FDA MAUDE Dashboard',
}

interface Props {
  searchParams: { ids?: string; type?: string }
}

function TierBadge({ tier }: { tier?: string }) {
  const cls =
    tier === 'HIGH'   ? 'bg-red-100 text-red-700 ring-red-300'    :
    tier === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 ring-yellow-300' :
                        'bg-green-100 text-green-700 ring-green-300'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${cls}`}>
      {tier ?? 'LOW'}
    </span>
  )
}

function SeverityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">
          {formatEventCount(count)}
          <span className="ml-1 text-gray-400">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%` }} />
      </div>
    </div>
  )
}

type Entity = Manufacturer | Device

function getEntityName(e: Entity): string {
  return 'name' in e ? e.name : e.brand_name
}

export default async function ComparePage({ searchParams }: Props) {
  const rawIds = (searchParams.ids ?? '').split('|').map((s) => decodeURIComponent(s.trim())).filter(Boolean)
  const type   = searchParams.type === 'device' ? 'device' : 'manufacturer'

  const entities: Array<Manufacturer | Device> = (
    await Promise.all(
      rawIds.map((id) =>
        type === 'device' ? getDevice(id) : getManufacturer(id),
      ),
    )
  ).filter((e): e is Manufacturer | Device => e !== null)

  const n           = entities.length
  const entityLabel = type === 'device' ? 'Device' : 'Manufacturer'

  const series = entities.map((e) => ({
    id:            e.id,
    name:          getEntityName(e),
    eventsByMonth: e.events_by_month,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="mb-1 text-xs text-gray-400">
            <Link href="/" className="hover:text-brand-600">Home</Link>
            <span className="mx-1">/</span>
            <span className="text-gray-900">Compare</span>
          </nav>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Comparing {n} {entityLabel}{n !== 1 ? 's' : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Side-by-side safety metrics for selected {entityLabel.toLowerCase()}s
          </p>
        </div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to search</Link>
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

      {entities.length > 0 && (
        <>
          {/* ── Entity overview cards ── */}
          <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {entities.map((e) => {
              const total = e.death_count + e.injury_count + e.malfunction_count
              return (
                <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-900 leading-snug text-sm">{getEntityName(e)}</p>
                    <TierBadge tier={e.risk_tier} />
                  </div>
                  <p className="mb-3 text-xs text-gray-400">
                    {formatEventCount(e.total_events)} total events
                    {e.death_count > 0 && (
                      <span className="ml-2 text-red-600 font-medium">· {formatEventCount(e.death_count)} deaths</span>
                    )}
                  </p>
                  <SeverityBar label="Deaths"       count={e.death_count}       total={total} color="bg-red-500"    />
                  <SeverityBar label="Injuries"     count={e.injury_count}      total={total} color="bg-orange-400" />
                  <SeverityBar label="Malfunctions" count={e.malfunction_count} total={total} color="bg-amber-400"  />
                  <Link
                    href={type === 'manufacturer'
                      ? `/manufacturer/${encodeURIComponent(e.id)}`
                      : `/device/${encodeURIComponent(e.id)}`}
                    className="mt-3 inline-block text-xs text-brand-600 hover:underline"
                  >
                    View full profile →
                  </Link>
                </div>
              )
            })}
          </div>

          {/* ── Metrics table ── */}
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
