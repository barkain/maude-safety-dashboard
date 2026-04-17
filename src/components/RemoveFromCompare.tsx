'use client'

import { useRouter } from 'next/navigation'
import { writeCompareIds } from './CompareSelector'

interface Props {
  removeId: string
  remainingIds: string[]
  type: 'manufacturer' | 'device'
}

export default function RemoveFromCompare({ removeId, remainingIds, type }: Props) {
  const router = useRouter()

  function remove() {
    const next = remainingIds.filter((id) => id !== removeId)
    writeCompareIds(next, next.length > 0 ? type : undefined)
    if (next.length === 0) {
      router.push('/')
    } else {
      router.replace(`/compare?ids=${next.map(encodeURIComponent).join('|')}&type=${type}`)
    }
  }

  return (
    <button
      onClick={remove}
      title="Remove from comparison"
      className="flex-shrink-0 rounded-full p-0.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
      </svg>
    </button>
  )
}
