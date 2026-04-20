/**
 * Minimal layout for print-optimized procurement reports.
 * No nav bar, no footer — just the page content.
 */
export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {children}
    </div>
  )
}
