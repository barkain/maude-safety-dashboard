'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface CompareSelectorProps {
  id: string
  name: string
  type: 'manufacturer' | 'device'
}

const STORAGE_KEY = 'maude_compare_ids'
const MAX_ITEMS   = 4

function readStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeStorage(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export default function CompareSelector({ id, name, type }: CompareSelectorProps) {
  const router = useRouter()
  const [ids,        setIds]        = useState<string[]>([])
  const [isSelected, setIsSelected] = useState(false)
  const [open,       setOpen]       = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = readStorage()
    setIds(stored)
    setIsSelected(stored.includes(id))
  }, [id])

  function toggle() {
    const stored = readStorage()
    let next: string[]
    if (stored.includes(id)) {
      next = stored.filter((x) => x !== id)
    } else {
      if (stored.length >= MAX_ITEMS) return // silently cap
      next = [...stored, id]
    }
    writeStorage(next)
    setIds(next)
    setIsSelected(next.includes(id))
  }

  function clear() {
    writeStorage([])
    setIds([])
    setIsSelected(false)
  }

  function compare() {
    router.push(`/compare?ids=${ids.join(',')}&type=${type}`)
  }

  const count = ids.length

  return (
    <div className="relative">
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
        </svg>
        Compare
        {count > 0 && (
          <span className="ml-0.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <p className="mb-1 text-xs font-semibold text-gray-700">Compare Mode</p>
          <p className="mb-3 text-[11px] text-gray-400">Select up to {MAX_ITEMS} items</p>

          {/* Add / remove current item */}
          <button
            onClick={toggle}
            disabled={!isSelected && count >= MAX_ITEMS}
            className={`mb-3 w-full rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isSelected
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : count >= MAX_ITEMS
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
            }`}
          >
            {isSelected
              ? `Remove "${name.length > 22 ? name.slice(0, 22) + '…' : name}"`
              : count >= MAX_ITEMS
              ? 'Max 4 items reached'
              : `Add "${name.length > 22 ? name.slice(0, 22) + '…' : name}"`}
          </button>

          {/* Status */}
          <p className="mb-3 text-center text-[11px] text-gray-500">
            {count === 0 ? 'No items selected' : `${count} item${count > 1 ? 's' : ''} selected`}
          </p>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={compare}
              disabled={count < 2}
              className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Compare
            </button>
            <button
              onClick={clear}
              disabled={count === 0}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
