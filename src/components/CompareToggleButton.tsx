'use client'

import { useCompareState } from '@/hooks/useCompareState'

interface CompareToggleButtonProps {
  id: string
  type: 'manufacturer' | 'device'
}

export default function CompareToggleButton({ id, type }: CompareToggleButtonProps) {
  const { isSelected, typeMismatch, atMax, tooltip, toggle } = useCompareState(id, type)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggle()
  }

  return (
    <button
      onClick={handleClick}
      disabled={atMax}
      title={tooltip}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold shadow-sm transition ${
        isSelected
          ? 'border-brand-400 bg-brand-50 text-brand-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
          : typeMismatch
          ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
          : atMax
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
          : 'border-brand-300 bg-white text-brand-700 hover:bg-brand-50'
      }`}
    >
      {isSelected ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
      )}
    </button>
  )
}
