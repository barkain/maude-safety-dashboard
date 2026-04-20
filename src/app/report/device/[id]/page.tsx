import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDevice } from '@/lib/firestore'
import { getAlternativeDevices, generateIncidentSummary } from '@/lib/reportData'
import PrintButton from './PrintButton'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const device = await getDevice(decodeURIComponent(params.id))
  if (!device) return { title: 'Report Not Found' }
  return {
    title: `VAC Safety Report — ${device.brand_name}`,
    description: `Procurement safety report for ${device.brand_name} (${device.generic_name}) based on FDA MAUDE adverse event data.`,
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

export default async function ReportPage({ params }: Props) {
  const device = await getDevice(decodeURIComponent(params.id))
  if (!device) notFound()

  const [alternatives, incidentSummary] = await Promise.all([
    getAlternativeDevices(device),
    generateIncidentSummary(device),
  ])

  const risk = riskColors[device.risk_tier] ?? riskColors.LOW
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const severityScore = Math.min(Math.round(device.severity_score), 100)
  const recallRisk = Math.round(device.recall_risk_score * 100)

  return (
    <div className="mx-auto max-w-4xl px-8 py-10 font-sans text-gray-900 print:px-0 print:py-0 print:max-w-none">

      {/* ── Print button — hidden in print ── */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <a href={`/device/${encodeURIComponent(device.id)}`} className="text-sm text-blue-600 hover:underline">
          ← Back to device page
        </a>
        <PrintButton />
      </div>

      {/* ══ REPORT HEADER ══════════════════════════════════════════════════════ */}
      <header className="border-b-2 border-gray-900 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Value Analysis Committee — Safety Intelligence Report
            </p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight text-gray-900">
              {device.brand_name}
            </h1>
            <p className="mt-0.5 text-base text-gray-600">{device.generic_name}</p>
            <p className="mt-0.5 text-sm text-gray-500">{device.manufacturer_name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Prepared</p>
            <p className="text-sm font-medium text-gray-700">{reportDate}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Risk Tier</p>
            <span className={`inline-block rounded-full border px-3 py-0.5 text-sm font-bold ${risk.bg} ${risk.text} ${risk.border}`}>
              {device.risk_tier}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          {device.product_code && (
            <span>Product Code: <span className="font-mono font-semibold text-gray-700">{device.product_code}</span></span>
          )}
          {device.medical_specialty && (
            <span>Specialty: <span className="font-semibold text-gray-700">{device.medical_specialty}</span></span>
          )}
          {device.device_class && (
            <span>Regulatory Class: <span className="font-semibold text-gray-700">{device.device_class}</span></span>
          )}
        </div>
      </header>

      {/* ══ EXECUTIVE SUMMARY ══════════════════════════════════════════════════ */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900 uppercase tracking-wide">
          1. Executive Summary
        </h2>

        {incidentSummary ? (
          <div className={`rounded-lg border p-5 ${risk.bg} ${risk.border}`}>
            <p className={`text-sm leading-relaxed ${risk.text}`}>{incidentSummary}</p>
            <p className="mt-2 text-[10px] text-gray-400">AI-generated summary based on FDA MAUDE data. Verify against primary sources before clinical decisions.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm text-gray-600">
              {device.brand_name} ({device.generic_name}) by {device.manufacturer_name} has recorded{' '}
              <strong>{device.total_events.toLocaleString()}</strong> adverse events in the FDA MAUDE dataset,
              including <strong>{device.death_count}</strong> deaths and{' '}
              <strong>{device.recall_count}</strong> recalls. Risk tier: <strong>{device.risk_tier}</strong>.
            </p>
          </div>
        )}
      </section>

      {/* ══ KEY SAFETY METRICS ════════════════════════════════════════════════ */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900 uppercase tracking-wide">
          2. Key Safety Metrics
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
              <td className="py-2.5 text-right font-semibold text-gray-900">{device.total_events.toLocaleString()}</td>
              <td className="py-2.5 text-right text-gray-500">—</td>
            </tr>
            <tr className="border-b border-gray-200 bg-red-50">
              <td className="py-2.5 text-red-800 font-medium">Deaths</td>
              <td className="py-2.5 text-right font-bold text-red-700">{device.death_count.toLocaleString()}</td>
              <td className="py-2.5 text-right text-red-600">{pct(device.death_count, device.total_events)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2.5 text-gray-800">Injuries</td>
              <td className="py-2.5 text-right font-semibold text-orange-700">{device.injury_count.toLocaleString()}</td>
              <td className="py-2.5 text-right text-gray-500">{pct(device.injury_count, device.total_events)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2.5 text-gray-800">Malfunctions</td>
              <td className="py-2.5 text-right font-semibold text-gray-700">{device.malfunction_count.toLocaleString()}</td>
              <td className="py-2.5 text-right text-gray-500">{pct(device.malfunction_count, device.total_events)}</td>
            </tr>
            <tr className="border-b-2 border-gray-900">
              <td className="py-2.5 text-gray-800">Recalls</td>
              <td className="py-2.5 text-right font-bold text-gray-900">{device.recall_count}</td>
              <td className="py-2.5 text-right text-gray-500">—</td>
            </tr>
          </tbody>
        </table>

        {/* Composite scores */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Severity Score</p>
            <p className={`mt-1 text-2xl font-extrabold ${
              severityScore >= 75 ? 'text-red-600' : severityScore >= 50 ? 'text-orange-600' : 'text-yellow-600'
            }`}>
              {severityScore}<span className="text-base font-normal text-gray-400">/100</span>
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">Weighted composite</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Recall Risk</p>
            <p className={`mt-1 text-2xl font-extrabold ${
              recallRisk >= 70 ? 'text-red-600' : recallRisk >= 40 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {recallRisk}<span className="text-base font-normal text-gray-400">%</span>
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">Model score</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center sm:col-span-1 col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Event Trend</p>
            <p className={`mt-1 text-lg font-bold ${
              device.projected_event_rate_trend === 'INCREASING' ? 'text-red-600' :
              device.projected_event_rate_trend === 'DECREASING' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {device.projected_event_rate_trend}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">Projected rate</p>
          </div>
        </div>
      </section>

      {/* ══ TOP REPORTED PROBLEMS ════════════════════════════════════════════ */}
      {device.top_problems.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-gray-900 uppercase tracking-wide">
            3. Top Reported Problems
          </h2>
          <ul className="space-y-1.5">
            {device.top_problems.slice(0, 10).map((p, i) => {
              const label = typeof p === 'string' ? p : (p as { problem: string }).problem
              const count = typeof p === 'string' ? null : (p as { problem: string; count: number }).count
              return (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                  <span className="shrink-0 rounded-full bg-gray-300 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-800">{label}</span>
                  {count != null && count > 0 && (
                    <span className="ml-auto shrink-0 text-xs font-semibold text-gray-500">{count.toLocaleString()} reports</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ══ COMPETITIVE ALTERNATIVES ══════════════════════════════════════════ */}
      {alternatives.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-bold text-gray-900 uppercase tracking-wide">
            4. Comparable Devices for Evaluation
          </h2>
          <p className="mb-4 text-xs text-gray-400">
            Devices in the same specialty ({device.medical_specialty}) from alternative manufacturers, ranked by adverse event volume.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900 bg-gray-50">
                  <th className="py-2 pr-4 text-left font-semibold text-gray-700">Device</th>
                  <th className="py-2 pr-4 text-left font-semibold text-gray-700">Manufacturer</th>
                  <th className="py-2 pr-3 text-right font-semibold text-gray-700">Events</th>
                  <th className="py-2 pr-3 text-right font-semibold text-gray-700">Deaths</th>
                  <th className="py-2 pr-3 text-right font-semibold text-gray-700">Recalls</th>
                  <th className="py-2 text-center font-semibold text-gray-700">Risk</th>
                </tr>
              </thead>
              <tbody>
                {/* Focal device — highlighted */}
                <tr className="border-b border-gray-200 bg-blue-50">
                  <td className="py-3 pr-4 font-semibold text-blue-900">
                    {device.brand_name}
                    <span className="ml-2 text-[10px] font-normal bg-blue-600 text-white rounded px-1 py-0.5">THIS DEVICE</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{device.manufacturer_name}</td>
                  <td className="py-3 pr-3 text-right font-semibold text-gray-900">{device.total_events.toLocaleString()}</td>
                  <td className="py-3 pr-3 text-right font-semibold text-red-700">{device.death_count.toLocaleString()}</td>
                  <td className="py-3 pr-3 text-right text-gray-700">{device.recall_count}</td>
                  <td className="py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      device.risk_tier === 'HIGH'   ? 'bg-red-100 text-red-700' :
                      device.risk_tier === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-green-100 text-green-700'
                    }`}>
                      {device.risk_tier}
                    </span>
                  </td>
                </tr>

                {alternatives.map((alt) => (
                  <tr key={alt.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{alt.brand_name}</td>
                    <td className="py-3 pr-4 text-gray-600">{alt.manufacturer_name}</td>
                    <td className="py-3 pr-3 text-right text-gray-800">{alt.total_events.toLocaleString()}</td>
                    <td className={`py-3 pr-3 text-right font-semibold ${alt.death_count > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {alt.death_count.toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 text-right text-gray-700">{alt.recall_count}</td>
                    <td className="py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        alt.risk_tier === 'HIGH'   ? 'bg-red-100 text-red-700' :
                        alt.risk_tier === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                                     'bg-green-100 text-green-700'
                      }`}>
                        {alt.risk_tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ══ DATA SOURCE & DISCLAIMER ══════════════════════════════════════════ */}
      <section className="mt-10 border-t border-gray-300 pt-6">
        <h2 className="mb-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
          Data Source & Disclaimer
        </h2>
        <div className="space-y-1.5 text-xs text-gray-500 leading-relaxed">
          <p>
            This report is based on adverse event data from the FDA Manufacturer and User Facility Device Experience (MAUDE) database,
            which contains voluntary and mandatory reports submitted to the FDA. Data covers the 2024–2026 period in this dataset.
          </p>
          <p>
            <strong>Limitations:</strong> MAUDE reports represent reported events only and may undercount actual adverse events.
            Event counts are not normalized by device sales volume or market share. This report does not constitute a clinical evaluation
            or replacement for professional medical assessment.
          </p>
          <p>
            <strong>For procurement decisions:</strong> This data should be considered alongside clinical literature, manufacturer specifications,
            and institutional experience. Consult your clinical engineering or biomedical team for device-specific evaluation criteria.
          </p>
          <p className="mt-2 font-medium text-gray-600">
            Generated by MAUDE Safety Dashboard · maude-safety-dashboard.web.app · {reportDate}
          </p>
        </div>
      </section>

    </div>
  )
}
