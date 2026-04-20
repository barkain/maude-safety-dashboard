'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-500">
        <path fillRule="evenodd" d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0118 8.653v4.097A2.25 2.25 0 0115.75 15h-.75v2.25A2.25 2.25 0 0112.75 19.5h-5.5A2.25 2.25 0 015 17.25V15h-.75A2.25 2.25 0 012 12.75V8.653c0-1.082.775-2.034 1.874-2.198.374-.056.749-.107 1.126-.153V2.75zm4.5 14.5h1a.75.75 0 000-1.5h-1a.75.75 0 000 1.5zm-3 0h1a.75.75 0 000-1.5h-1a.75.75 0 000 1.5zM6.5 2.5v3h7v-3h-7z" clipRule="evenodd" />
      </svg>
      Print / Save PDF
    </button>
  )
}
