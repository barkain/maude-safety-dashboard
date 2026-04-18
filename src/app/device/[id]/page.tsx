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

const classDescriptions: Record<string, string> = {
  'Class I':   'General controls only. Lowest risk — typically exempt from premarket review.',
  'Class II':  'General & special controls. Moderate risk — usually cleared via 510(k).',
  'Class III': 'Strictest regulation. Highest risk — requires Premarket Approval (PMA).',
}

const submissionTypes: Record<string, string> = {
  '1': '510(k) Premarket Notification',
  '2': 'Premarket Approval (PMA)',
  '3': 'Product Development Protocol',
  '4': 'Exempt',
  '5': '510(k) — Abbreviated',
  '6': 'Transitional',
  '7': 'De Novo Classification',
}

interface FdaClassification {
  device_name: string
  definition: string
  medical_specialty_description: string
  regulation_number: string
  submission_type_id: string
  device_class: string
  life_sustain_support_flag: string
  gmp_exempt_flag: string
}

async function fetchFdaClassification(productCode: string): Promise<FdaClassification | null> {
  if (!productCode) return null
  try {
    const res = await fetch(
      `https://api.fda.gov/device/classification.json?search=product_code:${productCode}&limit=1`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) } // cache 24h
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.results?.[0] ?? null
  } catch {
    return null
  }
}

async function generateDeviceDescription(brandName: string, genericName: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com'
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  if (!apiKey) return null
  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You write brief, clear product descriptions for medical devices aimed at hospital procurement staff and importers — not clinicians. Be factual and plain-spoken. No marketing language.',
          },
          {
            role: 'user',
            content: `In 2 sentences, describe what this medical device is and what it is used for.\nBrand name: ${brandName}\nFDA generic name: ${genericName}\n\nReply with only the 2-sentence description, nothing else.`,
          },
        ],
      }),
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}

export default async function DevicePage({ params }: Props) {
  const device = await getDevice(decodeURIComponent(params.id))
  if (!device) notFound()

  // manufacturer_id may be null in Firestore docs — derive it from the device ID (format: "mfr_key:product_code")
  const manufacturerId = device.manufacturer_id ?? (device.id.includes(':') ? device.id.split(':')[0] : device.id)

  const cls = classColors[device.device_class] ?? 'bg-gray-100 text-gray-700 ring-gray-300'

  // Fetch FDA classification + AI description in parallel
  const [fdaClass, aiDescription] = await Promise.all([
    fetchFdaClassification(device.product_code),
    generateDeviceDescription(device.brand_name, device.generic_name),
  ])

  const regulationUrl = fdaClass?.regulation_number
    ? `https://www.ecfr.gov/current/title-21/part-${fdaClass.regulation_number.split('.')[0]}/section-${fdaClass.regulation_number}`
    : null

  const submissionLabel = fdaClass?.submission_type_id
    ? (submissionTypes[fdaClass.submission_type_id] ?? `Type ${fdaClass.submission_type_id}`)
    : null

  const fdaDeviceClass = fdaClass?.device_class
    ? `Class ${fdaClass.device_class === '1' ? 'I' : fdaClass.device_class === '2' ? 'II' : fdaClass.device_class === '3' ? 'III' : fdaClass.device_class}`
    : null

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
        {(() => {
          const sev = Math.min(Math.round(device.severity_score), 100)
          const cls = sev >= 75
            ? 'bg-red-100 text-red-700 ring-red-300'
            : sev >= 50
            ? 'bg-orange-100 text-orange-700 ring-orange-300'
            : 'bg-yellow-100 text-yellow-700 ring-yellow-300'
          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset cursor-help ${cls}`}
              title="Severity score (0–100): a weighted composite of the death rate, injury rate, and recall rate for this device. Higher = more adverse outcomes relative to total events."
            >
              Severity {sev}/100
            </span>
          )
        })()}
      </div>

      {/* ── About this device ── */}
      {(aiDescription || fdaClass) && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-800">About This Device</h2>

          {aiDescription && (
            <div className="mb-4">
              <p className="text-sm leading-relaxed text-gray-600">{aiDescription}</p>
              <p className="mt-1 text-[10px] text-gray-400">AI-generated summary — verify against manufacturer documentation.</p>
            </div>
          )}

          {fdaClass && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Official FDA name */}
              {fdaClass.device_name && (
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">FDA Official Name</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{fdaClass.device_name}</p>
                </div>
              )}

              {/* Device class */}
              {fdaDeviceClass && (
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Regulatory Class</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{fdaDeviceClass}</p>
                  {classDescriptions[fdaDeviceClass] && (
                    <p className="mt-0.5 text-[11px] text-gray-500">{classDescriptions[fdaDeviceClass]}</p>
                  )}
                </div>
              )}

              {/* Submission pathway */}
              {submissionLabel && (
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Clearance Pathway</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{submissionLabel}</p>
                </div>
              )}

              {/* CFR regulation */}
              {fdaClass.regulation_number && (
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">CFR Regulation</p>
                  {regulationUrl ? (
                    <a
                      href={regulationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block text-sm font-medium text-brand-600 hover:underline"
                    >
                      21 CFR {fdaClass.regulation_number} ↗
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm font-medium text-gray-800">21 CFR {fdaClass.regulation_number}</p>
                  )}
                </div>
              )}

              {/* Life-sustaining */}
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Life-Sustaining</p>
                <p className={`mt-0.5 text-sm font-semibold ${
                  fdaClass.life_sustain_support_flag === 'Y' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {fdaClass.life_sustain_support_flag === 'Y' ? 'Yes'
                    : fdaClass.life_sustain_support_flag === 'N' ? 'No'
                    : '—'}
                </p>
              </div>

              {/* GMP */}
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">GMP Exempt</p>
                <p className="mt-0.5 text-sm font-medium text-gray-600">
                  {fdaClass.gmp_exempt_flag === 'Y' ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

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
            trend={device.projected_event_rate_trend}
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
