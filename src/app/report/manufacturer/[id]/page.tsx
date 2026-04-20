import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getManufacturer, getDevice } from '@/lib/firestore'
import { generateManufacturerSummary } from '@/lib/reportData'
import type { Device } from '@/lib/types'
import PrintButton from '../../device/[id]/PrintButton'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mfr = await getManufacturer(decodeURIComponent(params.id))
  if (!mfr) return { title: 'Report Not Found' }
  return {
    title: `Manufacturer Safety Report — ${mfr.name}`,
    description: `GPO/VAC procurement safety report for ${mfr.name} based on FDA MAUDE adverse event data.`,
  }
}

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  HIGH:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-300' },
  MEDIUM: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
  LOW:    { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-300' },
}

function pct(num: number, denom: number) {
  if (!denom) return '0%'
  return ((num / denom) * 100).toFixed(1) + '%'
}

const CLASS_LABELS: Record<string, string> = {
  '1': 'Class I', '2': 'Class II', '3': 'Class III',
  'f': 'Class II (Exempt)', 'u': 'Unclassified', 'n': 'Not Classified',
}

export default async function ManufacturerReportPage({ params }: Props) {
  const mfr = await getManufacturer(decodeURIComponent(params.id))
  if (!mfr) notFound()

  // Load actual device records in parallel
  const deviceRecords: Device[] = (
    await Promise.all(
      mfr.top_devices.map(async (td) => {
        const rawKey   = (td as { id?: string; key?: string; count: number }).id ?? (td as { key?: string }).key ?? ''
        const deviceId = rawKey.includes(':') ? rawKey : `${mfr.id}:${rawKey}`
        const real = await getDevice(deviceId).catch(() => null)
        if (real) return real
        // Stub fallback
        const name = (td as { name?: string; key?: string }).name ?? (td as { key?: string }).key ?? ''
        return {
          id: deviceId,
          manufacturer_id: mfr.id,
          manufacturer_name: mfr.name,
          brand_name: name,
          generic_name: '',
          product_code: '',
          device_class: 'Class II',
          medical_specialty: '',
          total_events: td.count,
          death_count: 0,
          injury_count: 0,
          malfunction_count: td.count,
          recall_count: 0,
          recall_rate: mfr.recall_rate,
          severity_score: mfr.severity_score,
          events_by_month: {},
          top_problems: [],
          last_updated: null,
          recall_risk_score: mfr.recall_risk_score,
          risk_tier: mfr.risk_tier,
          projected_event_rate_trend: mfr.projected_event_rate_trend,
        } satisfies Device
      })
    )
  ).filter(Boolean) as Device[]

  // Sort devices by deaths desc, then events desc
  const devicesSorted = [...deviceRecords].sort(
    (a, b) => b.death_count - a.death_count || b.total_events - a.total_events
  )

  const topDeviceNames = deviceRecords.map((d) => d.brand_name).filter(Boolean)

  const aiSummary = await generateManufacturerSummary({
    name: mfr.name,
    total_events: mfr.total_events,
    death_count: mfr.death_count,
    injury_count: mfr.injury_count,
    recall_count: mfr.recall_count,
    risk_tier: mfr.risk_tier,
    severity_score: mfr.severity_score,
    specialties: mfr.specialties as string[],
    top_device_names: topDeviceNames,
  })

  const risk = riskColors[mfr.risk_tier] ?? riskColors.LOW
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const severityScore = Math.min(Math.round(mfr.severity_score), 100)
  const recallRisk = Math.round(mfr.recall_risk_score * 100)

  const deviceClassEntries = Object.entries(mfr.device_classes)
    .sort(([, a], [, b]) => b - a)
    .map(([cls, count]) => [CLASS_LABELS[cls.toLowerCase()] ?? `Class ${cls}`, count] as [string, number])

  // Count devices by risk tier
  const tierCounts = deviceRecords.reduce<Record<string, number>>(
    (acc, d) => { acc[d.risk_tier] = (acc[d.risk_tier] ?? 0) + 1; return acc },
    {}
  )

  return (
    <div className="mx-auto max-w-4xl px-8 py-10 font-sans text-gray-900 print:px-0 print:py-0 print:max-w-none">

      {/* ── Print button — hidden in print ── */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <a href={`/manufacturer/${encodeURIComponent(mfr.id)}`} className="text-sm text-blue-600 hover:underline">
          ← Back to manufacturer page
        </a>
        <PrintButton />
      </div>

      {/* ══ REPORT HEADER ══════════════════════════════════════════════════════ */}
      <header className="border-b-2 border-gray-900 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              GPO / VAC Supplier Evaluation — Safety Intelligence Report
            </p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight text-gray-900">
              {mfr.name}
            </h1>
            {mfr.country && (
              <p className="mt-0.5 text-base text-gray-500">{mfr.country}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Prepared</p>
            <p className="text-sm font-medium text-gray-700">{reportDate}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Supplier Risk</p>
            <span className={`inline-block rounded-full border px-3 py-0.5 text-sm font-bold ${risk.bg} ${risk.text} ${risk.border}`}>
              {mfr.risk_tier}
            </span>
          </div>
        </div>

        {/* Specialty tags */}
        {Array.isArray(mfr.specialties) && mfr.specialties.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(mfr.specialties as string[]).map((s) => (
              <span key={s} className="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 text-[10px] font-medium text-gray-600">
                {s}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* ══ EXECUTIVE SUMMARY ══════════════════════════════════════════════════ */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900 uppercase tracking-wide">
          1. Executive Summary
        </h2>
        {aiSummary ? (
          <div className={`rounded-lg border p-5 ${risk.bg} ${risk.border}`}>
            <p className={`text-sm leading-relaxed ${risk.text}`}>{aiSummary}</p>
            <p className="mt-2 text-[10px] text-gray-400">AI-generated summary based on FDA MAUDE data. Verify against primary sources before contract decisions.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm text-gray-600">
              {mfr.name} has recorded{' '}
              <strong>{mfr.total_events.toLocaleString()}</strong> adverse events across its device portfolio,
              including <strong>{mfr.death_count.toLocaleString()}</strong> deaths and{' '}
              <strong>{mfr.recall_count}</strong> recalls. Supplier risk tier: <strong>{mfr.risk_tier}</strong>.
            </p>
          </div>
        )}
      </section>

      {/* ══ PORTFOLIO SAFETY METRICS ══════════════════════════════════════════ */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900 uppercase tracking-wide">
          2. Portfolio Safety Metrics
        </h2>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-2 text-left font-semibold text-gray-700">Metric</th>
              <th className="py-2 text-right font-semibold text-gray-700">Count</th>
              <th className="py-2 text-right font-semibold text-gray-700">% of Events</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2.5 text-gray-800">Total Adverse Events</td>
              <td className="py-2.5 text-right font-semibold text-gray-900">{mfr.total_events.toLocaleString()}</td>
              <td className="py-2.5 text-right text-gray-500">—</td>
            </tr>
            <tr className="border-b border-gray-200 bg-red-50">
              <td className="py-2.5 text-red-800 font-medium">Deaths</td>
              <td className="py-2.5 text-right font-bold text-red-700">{mfr.death_count.toLocaleString()}</td>
              <td className="py-2.5 text-right text-red-600">{pct(mfr.death_count, mfr.total_events)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2.5 text-gray-800">Injuries</td>
              <td className="py-2.5 text-right font-semibold text-orange-700">{mfr.injury_count.toLocaleString()}</td>
              <td className="py-2.5 text-right text-gray-500">{pct(mfr.injury_count, mfr.total_events)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2.5 text-gray-800">Malfunctions</td>
              <td className="py-2.5 text-right font-semibold text-gray-700">{mfr.malfunction_count.toLocaleString()}</td>
              <td className="py-2.5 text-right text-gray-500">{pct(mfr.malfunction_count, mfr.total_events)}</td>
            </tr>
            <tr className="border-b-2 border-gray-900">
              <td className="py-2.5 text-gray-800">Recalls</td>
              <td className="py-2.5 text-right font-bold text-gray-900">{mfr.recall_count}</td>
              <td className="py-2.5 text-right text-gray-500">—</td>
            </tr>
          </tbody>
        </table>

        {/* Composite scores */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Severity Score</p>
            <p className={`mt-1 text-2xl font-extrabold ${
              severityScore >= 75 ? 'text-red-600' : severityScore >= 50 ? 'text-orange-600' : 'text-yellow-600'
            }`}>
              {severityScore}<span className="text-base font-normal text-gray-400">/100</span>
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Recall Risk</p>
            <p className={`mt-1 text-2xl font-extrabold ${
              recallRisk >= 70 ? 'text-red-600' : recallRisk >= 40 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {recallRisk}<span className="text-base font-normal text-gray-400">%</span>
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Event Trend</p>
            <p className={`mt-1 text-lg font-bold ${
              mfr.projected_event_rate_trend === 'INCREASING' ? 'text-red-600' :
              mfr.projected_event_rate_trend === 'DECREASING' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {mfr.projected_event_rate_trend}
            </p>
          </div>
        </div>
      </section>

      {/* ══ DEVICE PORTFOLIO ══════════════════════════════════════════════════ */}
      {devicesSorted.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-bold text-gray-900 uppercase tracking-wide">
            3. Device Portfolio — Safety Breakdown
          </h2>
          <p className="mb-3 text-xs text-gray-400">
            Devices sorted by death count descending. Risk tier distribution:
            {tierCounts.HIGH ? ` ${tierCounts.HIGH} HIGH` : ''}
            {tierCounts.MEDIUM ? ` · ${tierCounts.MEDIUM} MEDIUM` : ''}
            {tierCounts.LOW ? ` · ${tierCounts.LOW} LOW` : ''}.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900 bg-gray-50">
                  <th className="py-2 pr-3 text-left font-semibold text-gray-700">Device</th>
                  <th className="py-2 pr-3 text-right font-semibold text-gray-700">Events</th>
                  <th className="py-2 pr-3 text-right font-semibold text-gray-700">Deaths</th>
                  <th className="py-2 pr-3 text-right font-semibold text-gray-700">Injuries</th>
                  <th className="py-2 pr-3 text-right font-semibold text-gray-700">Recalls</th>
                  <th className="py-2 text-center font-semibold text-gray-700">Risk</th>
                </tr>
              </thead>
              <tbody>
                {devicesSorted.map((d) => (
                  <tr key={d.id} className={`border-b border-gray-200 ${
                    d.risk_tier === 'HIGH' ? 'bg-red-50' : ''
                  }`}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-gray-900">{d.brand_name}</p>
                      {d.generic_name && (
                        <p className="text-[10px] text-gray-400">{d.generic_name}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-gray-800">{d.total_events.toLocaleString()}</td>
                    <td className={`py-2.5 pr-3 text-right font-semibold ${d.death_count > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {d.death_count.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-gray-700">{d.injury_count.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-right text-gray-700">{d.recall_count}</td>
                    <td className="py-2.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        d.risk_tier === 'HIGH'   ? 'bg-red-100 text-red-700' :
                        d.risk_tier === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                   'bg-green-100 text-green-700'
                      }`}>
                        {d.risk_tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ══ DEVICE CLASS & SPECIALTY EXPOSURE ════════════════════════════════ */}
      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* Device classes */}
        {deviceClassEntries.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-bold text-gray-900 uppercase tracking-wide">
              4a. Regulatory Class Mix
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="py-1.5 text-left font-semibold text-gray-700">Class</th>
                  <th className="py-1.5 text-right font-semibold text-gray-700">Events</th>
                </tr>
              </thead>
              <tbody>
                {deviceClassEntries.map(([cls, count]) => (
                  <tr key={cls} className="border-b border-gray-200">
                    <td className="py-2 text-gray-800">{cls}</td>
                    <td className="py-2 text-right font-medium text-gray-700">{(count as number).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[10px] text-gray-400">Class III = highest regulation (PMA required)</p>
          </div>
        )}

        {/* Specialties */}
        {Array.isArray(mfr.specialties) && mfr.specialties.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-bold text-gray-900 uppercase tracking-wide">
              4b. Clinical Exposure
            </h2>
            <div className="flex flex-wrap gap-2">
              {(mfr.specialties as string[]).map((s) => (
                <span key={s} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-400">
              Hospital departments affected by this supplier&apos;s product portfolio.
            </p>
          </div>
        )}
      </section>

      {/* ══ DISCLAIMER ════════════════════════════════════════════════════════ */}
      <section className="mt-10 border-t border-gray-300 pt-6">
        <h2 className="mb-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
          Data Source & Disclaimer
        </h2>
        <div className="space-y-1.5 text-xs text-gray-500 leading-relaxed">
          <p>
            This report is based on adverse event data from the FDA Manufacturer and User Facility Device Experience (MAUDE) database.
            Data covers the 2024–2026 period in this dataset. Reported events may undercount actual adverse outcomes; counts are not
            normalized by market share or sales volume.
          </p>
          <p>
            <strong>For contract decisions:</strong> This data should be considered alongside clinical literature, manufacturer quality system documentation,
            and institutional experience. Consult clinical engineering or biomedical staff for device-specific evaluation.
          </p>
          <p className="mt-2 font-medium text-gray-600">
            Generated by MAUDE Safety Dashboard · {reportDate}
          </p>
        </div>
      </section>

    </div>
  )
}
