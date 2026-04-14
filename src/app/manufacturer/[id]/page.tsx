import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getManufacturer } from '@/lib/firestore'
import { formatEventCount } from '@/lib/search'
import StatCard from '@/components/StatCard'
import RecallBadge from '@/components/RecallBadge'
import EventTrendChart from '@/components/EventTrendChart'
import SeverityBreakdown from '@/components/SeverityBreakdown'
import DeviceCard from '@/components/DeviceCard'
import RiskScoreGauge from '@/components/RiskScoreGauge'
import TrendBadge from '@/components/TrendBadge'
import CompareSelector from '@/components/CompareSelector'
import type { Device } from '@/lib/types'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mfr = await getManufacturer(decodeURIComponent(params.id))
  if (!mfr) return { title: 'Manufacturer Not Found' }
  return { title: mfr.name }
}

export default async function ManufacturerPage({ params }: Props) {
  const mfr = await getManufacturer(decodeURIComponent(params.id))
  if (!mfr) notFound()

  // Synthesise Device stubs from top_devices for the cards
  const deviceStubs: Device[] = mfr.top_devices.map((td) => {
    // top_devices may be {id, name, count} or {key, count} depending on aggregation version
    const deviceId   = (td as {id?: string; key?: string; name?: string; count: number}).id   ?? (td as {key?: string}).key   ?? ''
    const deviceName = (td as {name?: string; key?: string}).name ?? (td as {key?: string}).key ?? ''
    return ({
    id:                           deviceId,
    manufacturer_id:              mfr.id,
    manufacturer_name:            mfr.name,
    brand_name:                   deviceName,
    generic_name:                 '',
    product_code:                 '',
    device_class:                 'Class II',
    medical_specialty:            '',
    total_events:                 td.count,
    death_count:                  0,
    injury_count:                 0,
    malfunction_count:            td.count,
    recall_count:                 0,
    recall_rate:                  mfr.recall_rate,
    severity_score:               mfr.severity_score,
    events_by_month:              {},
    top_problems:                 [],
    last_updated:                 null,
    recall_risk_score:            mfr.recall_risk_score,
    risk_tier:                    mfr.risk_tier,
    projected_event_rate_trend:   mfr.projected_event_rate_trend,
  })
  })

  const deviceClassEntries = Object.entries(mfr.device_classes).sort(
    ([, a], [, b]) => b - a,
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Breadcrumb ── */}
      <nav className="mb-4 text-xs text-gray-400">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-600">Manufacturers</span>
        <span className="mx-1">/</span>
        <span className="text-gray-900">{mfr.name}</span>
      </nav>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{mfr.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{mfr.country}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RecallBadge rate={mfr.recall_rate} count={mfr.recall_count} />
          <CompareSelector id={mfr.id} name={mfr.name} type="manufacturer" />
        </div>
      </div>

      {/* ── Severity score pill ── */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-400">Severity Score:</span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
            mfr.severity_score >= 75
              ? 'bg-red-100 text-red-700'
              : mfr.severity_score >= 50
              ? 'bg-orange-100 text-orange-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {mfr.severity_score} / 100
        </span>
      </div>

      {/* ── Stats row ── */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Events"  value={formatEventCount(mfr.total_events)}      accent="blue"   />
        <StatCard label="Deaths"        value={formatEventCount(mfr.death_count)}        accent="red"    />
        <StatCard label="Injuries"      value={formatEventCount(mfr.injury_count)}       accent="orange" />
        <StatCard label="Malfunctions"  value={formatEventCount(mfr.malfunction_count)}  accent="yellow" />
        <StatCard label="Recalls"       value={mfr.recall_count}                         accent="red"    />
      </div>

      {/* ── Supply Chain Risk section ── */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-800">Supply Chain Risk</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Gauge */}
          <div className="lg:col-span-2">
            <RiskScoreGauge
              score={mfr.supply_chain_risk_score}
              label="Supply Chain Risk Score"
            />
          </div>
          {/* Badges */}
          <div className="flex flex-col gap-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs text-gray-400">Event Rate Trend</p>
              <TrendBadge trend={mfr.projected_event_rate_trend} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs text-gray-400">Risk Tier</p>
              <RecallBadge rate={mfr.recall_rate} />
            </div>
          </div>
        </div>
        {/* Countries */}
        {mfr.countries.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {mfr.countries.map((c) => (
              <span
                key={c}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600 shadow-sm"
              >
                {c}
              </span>
            ))}
          </div>
        )}
        {/* Narrative */}
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{mfr.supply_chain_summary}</p>
      </section>

      {/* ── Charts row ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <EventTrendChart eventsByMonth={mfr.events_by_month} title="Events per Month (Last 12 mo)" />
        <SeverityBreakdown
          deathCount={mfr.death_count}
          injuryCount={mfr.injury_count}
          malfunctionCount={mfr.malfunction_count}
          title="Event Type Breakdown"
        />
      </div>

      {/* ── Device classes ── */}
      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Device Classes</h2>
        <div className="flex flex-wrap gap-2">
          {deviceClassEntries.map(([cls, count]) => (
            <span key={cls} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs shadow-sm">
              <span className="font-medium">{cls}</span>
              <span className="ml-1 text-gray-400">({count.toLocaleString()} events)</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Top devices table ── */}
      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Top Reported Devices</h2>
        {deviceStubs.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deviceStubs.map((d) => (
              <DeviceCard key={d.id} device={d} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No device data available.</p>
        )}
      </section>
    </div>
  )
}
