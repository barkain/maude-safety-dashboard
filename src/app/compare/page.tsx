import type { Metadata } from 'next'
import Link from 'next/link'
import { getManufacturer, getDevice } from '@/lib/firestore'
import type { Manufacturer, Device } from '@/lib/types'
import CompareTable from '@/components/CompareTable'
import MultiEntityTrendChart from '@/components/MultiEntityTrendChart'
import { formatEventCount } from '@/lib/search'
import RemoveFromCompare from '@/components/RemoveFromCompare'

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

function RiskBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{formatEventCount(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }} />
      </div>
    </div>
  )
}

type Entity = Manufacturer | Device

function getEntityName(e: Entity): string {
  return 'name' in e ? e.name : e.brand_name
}

function isMfr(e: Entity): e is Manufacturer {
  return 'name' in e && 'supply_chain_risk_score' in e
}

export default async function ComparePage({ searchParams }: Props) {
  const rawIds = (searchParams.ids ?? '').split('|').map((s) => decodeURIComponent(s.trim())).filter(Boolean)
  const type   = searchParams.type === 'device' ? 'device' : 'manufacturer'

  const entities: Entity[] = (
    await Promise.all(
      rawIds.map((id) =>
        type === 'device' ? getDevice(id) : getManufacturer(id),
      ),
    )
  ).filter((e): e is Entity => e !== null)

  const n           = entities.length
  const entityLabel = type === 'device' ? 'Device' : 'Manufacturer'

  const series = entities.map((e) => ({
    id:            e.id,
    name:          getEntityName(e),
    eventsByMonth: e.events_by_month,
  }))

  // Normalize severity bars against the max total events across compared entities
  const maxEvents = Math.max(...entities.map((e) => e.total_events), 1)

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
            Side-by-side safety metrics — worst value highlighted red, best highlighted green
          </p>
        </div>
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to search</Link>
      </div>

      {/* ── Empty state ── */}
      {entities.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No entities found for the provided IDs.</p>
          <p className="mt-2 text-xs text-gray-400">
            Use the Compare button on any {entityLabel.toLowerCase()} page to add items.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
            Return to home
          </Link>
        </div>
      )}

      {entities.length === 1 && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Only one entity loaded — add at least one more to compare side by side.
        </div>
      )}

      {entities.length > 0 && (
        <>
          {/* ── Entity overview cards ── */}
          <div
            className="mb-6 grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(n, 4)}, minmax(0, 1fr))` }}
          >
            {entities.map((e) => (
              <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                {/* Name + tier + remove */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-snug text-gray-900">{getEntityName(e)}</p>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <TierBadge tier={e.risk_tier} />
                    <RemoveFromCompare removeId={e.id} remainingIds={rawIds} type={type} />
                  </div>
                </div>

                {/* Device-specific subtitle */}
                {!isMfr(e) && (
                  <p className="mb-2 text-[11px] text-gray-400">
                    {e.generic_name}
                    {e.device_class ? ` · ${e.device_class}` : ''}
                    {e.medical_specialty ? ` · ${e.medical_specialty}` : ''}
                  </p>
                )}

                {/* Manufacturer-specific subtitle */}
                {isMfr(e) && (
                  <p className="mb-2 text-[11px] text-gray-400">
                    {e.country}
                    {e.specialties?.length ? ` · ${e.specialties.slice(0, 2).join(', ')}` : ''}
                  </p>
                )}

                {/* Severity bars — normalized across compared entities */}
                <RiskBar label="Deaths"       value={e.death_count}       max={maxEvents} color="bg-red-500"    />
                <RiskBar label="Injuries"     value={e.injury_count}      max={maxEvents} color="bg-orange-400" />
                <RiskBar label="Malfunctions" value={e.malfunction_count} max={maxEvents} color="bg-amber-400"  />

                {/* Recall risk score */}
                {e.recall_risk_score != null && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                    <span className="text-gray-500">Recall Risk</span>
                    <span className={`font-bold ${
                      e.recall_risk_score >= 0.6 ? 'text-red-600'
                      : e.recall_risk_score >= 0.3 ? 'text-yellow-600'
                      : 'text-green-600'
                    }`}>
                      {(e.recall_risk_score * 100).toFixed(0)}/100
                    </span>
                  </div>
                )}

                {/* Supply chain risk (manufacturers only) */}
                {isMfr(e) && (
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                    <span className="text-gray-500">Supply Chain Risk</span>
                    <span className={`font-bold ${
                      e.supply_chain_risk_score >= 7 ? 'text-red-600'
                      : e.supply_chain_risk_score >= 4 ? 'text-yellow-600'
                      : 'text-green-600'
                    }`}>
                      {e.supply_chain_risk_score.toFixed(1)}/10
                    </span>
                  </div>
                )}

                <Link
                  href={type === 'manufacturer'
                    ? `/manufacturer/${encodeURIComponent(e.id)}`
                    : `/device/${encodeURIComponent(e.id)}`}
                  className="mt-3 inline-block text-xs text-brand-600 hover:underline"
                >
                  View full profile →
                </Link>
              </div>
            ))}
          </div>

          {/* ── Metrics table ── */}
          <section className="mb-6">
            <h2 className="mb-3 text-base font-semibold text-gray-800">Metrics Comparison</h2>
            <CompareTable entities={entities} />
          </section>

          {/* ── Overlay trend chart ── */}
          <section className="mb-6">
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

          {/* ── Type-specific detail sections ── */}
          {type === 'manufacturer' && (
            <section className="mb-6">
              <h2 className="mb-3 text-base font-semibold text-gray-800">Top Reported Devices</h2>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(n, 4)}, minmax(0, 1fr))` }}
              >
                {entities.map((e) => {
                  const mfr = e as Manufacturer
                  return (
                    <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {getEntityName(e)}
                      </p>
                      {mfr.top_devices?.length > 0 ? (
                        <ol className="space-y-1.5">
                          {mfr.top_devices.slice(0, 5).map((d, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
                                {i + 1}
                              </span>
                              <Link
                                href={`/device/${encodeURIComponent(d.id)}`}
                                className="flex-1 truncate text-gray-700 hover:text-brand-600"
                              >
                                {d.name}
                              </Link>
                              <span className="shrink-0 text-gray-400">{formatEventCount(d.count)}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-xs text-gray-400">No device data</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {type === 'device' && (
            <section className="mb-6">
              <h2 className="mb-3 text-base font-semibold text-gray-800">Top Reported Problems</h2>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(n, 4)}, minmax(0, 1fr))` }}
              >
                {entities.map((e) => {
                  const dev = e as Device
                  const problems = dev.top_problems ?? []
                  return (
                    <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {getEntityName(e)}
                      </p>
                      {dev.product_code && (
                        <p className="mb-2 text-[10px] text-gray-400">
                          Product code: <span className="font-mono text-gray-600">{dev.product_code}</span>
                        </p>
                      )}
                      {problems.length > 0 ? (
                        <ol className="space-y-1.5">
                          {problems.slice(0, 5).map((p, i) => {
                            const label = typeof p === 'string' ? p : (p as { problem: string }).problem
                            return (
                              <li key={i} className="flex items-start gap-2 text-xs">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
                                  {i + 1}
                                </span>
                                <span className="text-gray-700">{label}</span>
                              </li>
                            )
                          })}
                        </ol>
                      ) : (
                        <p className="text-xs text-gray-400">No problem data</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
