import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getDevice } from '@/lib/firestore'
import { formatEventCount } from '@/lib/search'
import StatCard from '@/components/StatCard'
import RecallBadge from '@/components/RecallBadge'
import EventTrendChart from '@/components/EventTrendChart'
import SeverityBreakdown from '@/components/SeverityBreakdown'
import RiskScoreGauge from '@/components/RiskScoreGauge'
import TrendBadge from '@/components/TrendBadge'
import CompareSelector from '@/components/CompareSelector'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const device = await getDevice(decodeURIComponent(params.id))
  if (!device) return { title: 'Device Not Found' }
  return { title: `${device.brand_name} — ${device.generic_name}` }
}

const classColors: Record<string, string> = {
  'Class I':   'bg-green-100 text-green-700 ring-green-300',
  'Class II':  'bg-blue-100 text-blue-700 ring-blue-300',
  'Class III': 'bg-red-100 text-red-700 ring-red-300',
}

export default async function DevicePage({ params }: Props) {
  const device = await getDevice(decodeURIComponent(params.id))
  if (!device) notFound()

  // manufacturer_id may be null in Firestore docs — derive it from the device ID (format: "mfr_key:product_code")
  const manufacturerId = device.manufacturer_id ?? (device.id.includes(':') ? device.id.split(':')[0] : device.id)

  const cls = classColors[device.device_class] ?? 'bg-gray-100 text-gray-700 ring-gray-300'

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Breadcrumb ── */}
      <nav className="mb-4 text-xs text-gray-400">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span className="mx-1">/</span>
        <Link href={`/manufacturer/${encodeURIComponent(manufacturerId)}`} className="hover:text-brand-600">
          {device.manufacturer_name}
        </Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900">{device.brand_name}</span>
      </nav>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              {device.brand_name}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}
            >
              {device.device_class}
            </span>
            <TrendBadge trend={device.projected_event_rate_trend} size="sm" />
          </div>
          <p className="mt-1 text-sm text-gray-500">{device.generic_name}</p>
          <Link
            href={`/manufacturer/${encodeURIComponent(manufacturerId)}`}
            className="mt-0.5 inline-block text-xs text-brand-600 hover:underline"
          >
            {device.manufacturer_name}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RecallBadge rate={device.recall_rate} count={device.recall_count} />
          <CompareSelector id={device.id} name={device.brand_name} type="device" />
        </div>
      </div>

      {/* ── Meta row ── */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
        {device.product_code && (
          <span>Product Code: <span className="font-mono font-medium text-gray-600">{device.product_code}</span></span>
        )}
        {device.medical_specialty && (
          <span>Specialty: <span className="font-medium text-gray-600">{device.medical_specialty}</span></span>
        )}
        {/* Severity score pill */}
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
          device.severity_score >= 75
            ? 'bg-red-100 text-red-700 ring-red-300'
            : device.severity_score >= 50
            ? 'bg-orange-100 text-orange-700 ring-orange-300'
            : 'bg-yellow-100 text-yellow-700 ring-yellow-300'
        }`}>
          Severity {device.severity_score}/100
        </span>
      </div>

      {/* ── Stats row ── */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Events"  value={formatEventCount(device.total_events)}      accent="blue"   />
        <StatCard label="Deaths"        value={formatEventCount(device.death_count)}        accent="red"    />
        <StatCard label="Injuries"      value={formatEventCount(device.injury_count)}       accent="orange" />
        <StatCard label="Malfunctions"  value={formatEventCount(device.malfunction_count)}  accent="yellow" />
        <StatCard label="Recalls"       value={device.recall_count}                         accent="red"    />
      </div>

      {/* ── Recall Risk Gauge ── */}
      <div className="mt-6">
        <RiskScoreGauge
          score={device.recall_risk_score * 10}
          label="Recall Risk Score"
          overrideTier={device.risk_tier}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {Object.keys(device.events_by_month).length > 0 ? (
          <EventTrendChart
            eventsByMonth={device.events_by_month}
            title="Events per Month (Last 12 mo)"
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
            No monthly trend data available.
          </div>
        )}
        <SeverityBreakdown
          deathCount={device.death_count}
          injuryCount={device.injury_count}
          malfunctionCount={device.malfunction_count}
          title="Event Type Breakdown"
        />
      </div>

      {/* ── Top product problems ── */}
      {device.top_problems.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold text-gray-800">Top Reported Problems</h2>
          <ol className="space-y-2">
            {device.top_problems.map((p, i) => {
              const label = typeof p === 'string' ? p : (p as {problem: string; count?: number}).problem
              const count = typeof p === 'string' ? null : (p as {problem: string; count?: number}).count
              return (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-700">{label}</span>
                  {count != null && (
                    <span className="text-xs text-gray-400">{count} reports</span>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {/* ── Back link ── */}
      <div className="mt-10">
        <Link
          href={`/manufacturer/${encodeURIComponent(manufacturerId)}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← Back to {device.manufacturer_name}
        </Link>
      </div>
    </div>
  )
}
