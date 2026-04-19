'use client'

import { useEffect, useState } from 'react'
import {
  readCompareIds,
  readCompareType,
  writeCompareIds,
  COMPARE_CHANGE_EVENT,
} from './CompareSelector'

interface CompareToggleButtonProps {
  id: string
  type: 'manufacturer' | 'device'
}

const MAX_ITEMS = 4

export default function CompareToggleButton({ id, type }: CompareToggleButtonProps) {
  const [isSelected, setIsSelected] = useState(false)
  const [count, setCount] = useState(0)
  const [currentType, setCurrentType] = useState<'manufacturer' | 'device' | null>(null)

  function sync() {
    const stored = readCompareIds()
    setIsSelected(stored.includes(id))
    setCount(stored.length)
    setCurrentType(readCompareType())
  }

  useEffect(() => {
    sync()
    window.addEventListener(COMPARE_CHANGE_EVENT, sync)
    return () => window.removeEventListener(COMPARE_CHANGE_EVENT, sync)
  }, [id])

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const stored = readCompareIds()
    if (stored.includes(id)) {
      const next = stored.filter((x) => x !== id)
      writeCompareIds(next, next.length > 0 ? type : undefined)
      return
    }
    // Different type in basket — clear and start fresh
    if (currentType && currentType !== type) {
      writeCompareIds([id], type)
      return
    }
    if (stored.length >= MAX_ITEMS) return
    writeCompareIds([...stored, id], type)
  }

  const typeMismatch = !isSelected && count > 0 && currentType !== null && currentType !== type
  const atMax = !isSelected && !typeMismatch && count >= MAX_ITEMS

  const tooltip = isSelected
    ? 'Remove from comparison'
    : typeMismatch
    ? `Currently comparing ${currentType}s — click to start a new comparison`
    : atMax
    ? 'Maximum 4 items for comparison'
    : 'Add to comparison'

  return (
    <button
      onClick={handleClick}
      disabled={atMax}
      title={tooltip}
      className={`group/cmp relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold shadow-sm transition ${
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
