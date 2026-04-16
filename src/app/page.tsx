import type { Metadata } from 'next'
import Link from 'next/link'
import { getTopManufacturers, getTopDevices, getHighRiskManufacturers, getHighRiskDevices } from '@/lib/firestore'
import { formatEventCount } from '@/lib/search'
import SearchBar from '@/components/SearchBar'
import ManufacturerCard from '@/components/ManufacturerCard'
import DeviceCard from '@/components/DeviceCard'
import StatCard from '@/components/StatCard'

export const metadata: Metadata = {
  title: 'FDA MAUDE Dashboard — Medical Device Safety',
}

const HEADLINE_STATS = [
  { label: 'Total Events (2024-25)', value: '600K+',   sub: 'MAUDE reports analysed',   accent: 'blue'   },
  { label: 'Manufacturers Tracked',  value: '2,086',   sub: 'Unique reporting entities', accent: 'green'  },
  { label: 'Device Types',           value: '5,555',   sub: 'Across all product codes',  accent: 'default'},
  { label: 'High Risk Entities',     value: '181',     sub: 'Flagged for procurement review', accent: 'orange' },
] as const

const NL_EXAMPLES = [
  'insulin pump high recall risk',
  'cardiac devices with deaths',
  'Medtronic',
  'respiratory manufacturer Europe',
]

export default async function HomePage() {
  const [topMfrs, topDevices, highRiskMfrs, highRiskDevices] = await Promise.all([
    getTopManufacturers(6),
    getTopDevices(6),
    getHighRiskManufacturers(3),
    getHighRiskDevices(3),
  ])

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            FDA MAUDE Data — 2024–2025
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
            Medical Device Adverse&nbsp;Event Dashboard
          </h1>
          <p className="mt-4 text-base text-brand-100 sm:text-lg">
            Search 600,000+ FDA MAUDE reports. Evaluate device safety, compare
            manufacturers, and assess supply chain risk — all in one place.
          </p>

          <div className="mt-8 mx-auto max-w-xl">
            <SearchBar autoFocus />
          </div>

          {/* NL search example chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-brand-200">Try:</span>
            {NL_EXAMPLES.map((ex) => (
              <Link
                key={ex}
                href={`/search?q=${encodeURIComponent(ex)}`}
                className="rounded-full bg-white/15 px-3 py-1 text-xs text-white transition hover:bg-white/25"
              >
                {ex}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {/* ── Headline stats ── */}
        <section className="-mt-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {HEADLINE_STATS.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                sub={s.sub}
                accent={s.accent as 'default' | 'blue' | 'green' | 'orange'}
                className="shadow-md"
              />
            ))}
          </div>
        </section>

        {/* ── Risk Watch ── */}
        {(highRiskMfrs.length > 0 || highRiskDevices.length > 0) && (
          <section className="mt-12">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </span>
              <h2 className="text-lg font-bold text-gray-900">Risk Watch</h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">HIGH risk</span>
              <span className="ml-auto text-xs text-gray-400">Flagged by supply chain risk score</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highRiskMfrs.map((m) => <ManufacturerCard key={m.id} manufacturer={m} />)}
              {highRiskDevices.map((d) => <DeviceCard key={d.id} device={d} />)}
            </div>

            <div className="mt-3 text-right">
              <Link href="/search?q=high+risk+manufacturer" className="text-xs text-brand-600 hover:underline">
                View all high-risk entities →
              </Link>
            </div>
          </section>
        )}

        {/* ── Top Manufacturers ── */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Top Manufacturers by Events</h2>
            <span className="text-xs text-gray-400">Ranked by total adverse event reports</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topMfrs.map((m) => (
              <ManufacturerCard key={m.id} manufacturer={m} />
            ))}
          </div>
        </section>

        {/* ── Top Devices ── */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Top Devices by Events</h2>
            <span className="text-xs text-gray-400">Ranked by total adverse event reports</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topDevices.map((d) => (
              <DeviceCard key={d.id} device={d} />
            ))}
          </div>
        </section>

        {/* ── About banner ── */}
        <section className="mt-12 rounded-2xl border border-brand-100 bg-brand-50 px-6 py-6">
          <h3 className="font-semibold text-brand-900">What is MAUDE?</h3>
          <p className="mt-1 text-sm text-brand-700">
            The FDA&apos;s Medical Device Adverse Event Reporting system (MAUDE) collects mandatory
            reports from manufacturers, importers, and device user facilities, plus voluntary
            reports from health professionals and consumers. This dashboard aggregates and
            visualises that data to support procurement decisions, regulatory research, and
            patient safety analysis.
          </p>
        </section>
      </div>
    </>
  )
}
