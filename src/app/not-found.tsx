import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-6xl font-extrabold text-gray-200">404</p>
      <h2 className="mt-4 text-xl font-semibold text-gray-700">Page Not Found</h2>
      <p className="mt-2 text-sm text-gray-400">
        The device, manufacturer, or page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="mt-6 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition">
        Back to Search
      </Link>
    </div>
  )
}
