import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-extrabold text-gray-900">About this Dashboard</h1>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600">
        <p>
          The <strong>FDA MAUDE Dashboard</strong> aggregates data from the FDA&apos;s
          Manufacturer and User Facility Device Experience (MAUDE) database — a repository of
          medical device adverse event reports submitted by manufacturers, importers, device user
          facilities, voluntary reporters, and the FDA itself.
        </p>
        <p>
          This tool is designed for medical device importers, procurement officers, regulatory
          affairs professionals, and patient safety researchers who need quick, visual access to
          device safety histories without navigating the raw FDA search interface.
        </p>

        <h2 className="pt-2 text-base font-semibold text-gray-800">Data Coverage</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>600,000+ adverse event records from 2024–2026</li>
          <li>Covers manufacturers, device types, and event outcomes</li>
          <li>Recall data cross-referenced from FDA recall database</li>
        </ul>

        <h2 className="pt-2 text-base font-semibold text-gray-800">Disclaimer</h2>
        <p>
          This dashboard is for informational purposes only. Data may be incomplete or
          out-of-date. Do not use this tool as the sole basis for regulatory or procurement
          decisions. Always consult official FDA resources and qualified regulatory professionals.
        </p>
      </div>

      <div className="mt-8">
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to Search</Link>
      </div>
    </div>
  )
}
