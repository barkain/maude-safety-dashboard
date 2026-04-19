'use client'

import { useEffect, useState } from 'react'
import {
  readCompareIds,
  readCompareType,
  writeCompareIds,
  COMPARE_CHANGE_EVENT,
} from '@/components/CompareSelector'

const MAX_ITEMS = 4

export interface CompareState {
  isSelected: boolean
  typeMismatch: boolean
  atMax: boolean
  tooltip: string
  toggle: () => void
}

export function useCompareState(
  id: string,
  type: 'manufacturer' | 'device',
): CompareState {
  const [isSelected,  setIsSelected]  = useState(false)
  const [count,       setCount]       = useState(0)
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

  function toggle() {
    const stored = readCompareIds()
    if (stored.includes(id)) {
      const next = stored.filter((x) => x !== id)
      writeCompareIds(next, next.length > 0 ? type : undefined)
      return
    }
    if (currentType && currentType !== type) {
      writeCompareIds([id], type)
      return
    }
    if (stored.length >= MAX_ITEMS) return
    writeCompareIds([...stored, id], type)
  }

  const typeMismatch = !isSelected && count > 0 && currentType !== null && currentType !== type
  const atMax        = !isSelected && !typeMismatch && count >= MAX_ITEMS

  const tooltip = isSelected
    ? 'Remove from comparison'
    : typeMismatch
    ? `Currently comparing ${currentType}s — click to start a new comparison`
    : atMax
    ? 'Maximum 4 items for comparison'
    : 'Add to comparison'

  return { isSelected, typeMismatch, atMax, tooltip, toggle }
}
