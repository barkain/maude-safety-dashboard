import type { Metadata } from 'next'
import './globals.css'
import CompareNavItem from '@/components/CompareNavItem'

export const metadata: Metadata = {
  title: {
    template: '%s | MAUDE Dashboard',
    default:  'FDA MAUDE Dashboard — Medical Device Safety',
  },
  description:
    'Search and explore FDA MAUDE adverse event data for medical devices and manufacturers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen w-full flex flex-col overflow-x-hidden">
          {/* ── Nav ── */}
          <header className="border-b border-gray-200 bg-white shadow-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
              <a href="/" className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
                  M
                </span>
                <span className="text-base font-semibold text-gray-900 hidden sm:block">
                  MAUDE Dashboard
                </span>
              </a>
              <nav className="flex items-center gap-3 text-sm text-gray-500 sm:gap-4">
                <CompareNavItem />
                <a href="/risk" className="hover:text-brand-600 transition-colors font-medium text-red-600">Risk ↑</a>
                <a href="/about" className="hover:text-brand-600 transition-colors">About</a>
                <a
                  href="https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:block hover:text-brand-600 transition-colors"
                >
                  FDA Source
                </a>
              </nav>
            </div>
          </header>

          {/* ── Main content ── */}
          <main className="flex-1">
            {children}
          </main>

          {/* ── Footer ── */}
          <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
            Data sourced from the{' '}
            <a
              href="https://www.fda.gov/medical-devices/mandatory-reporting-requirements-manufacturers-importers-and-device-user-facilities/medical-device-reporting-mdr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600"
            >
              FDA MAUDE database
            </a>
            . This dashboard is for informational purposes only. Not a substitute for
            professional regulatory advice. &copy; {new Date().getFullYear()}
          </footer>
        </div>
      </body>
    </html>
  )
}
