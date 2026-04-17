export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import {
  searchManufacturers,
  searchDevices,
  getTopManufacturers,
  getTopDevices,
} from '@/lib/firestore'
import type { SearchResult } from '@/lib/types'

interface SearchIntent {
  entity_type: 'manufacturer' | 'device' | 'both'
  keywords: string[]
  risk_tier?: 'HIGH' | 'MEDIUM' | 'LOW'
  has_deaths?: boolean
  sort_by?: 'events' | 'risk' | 'recalls'
  summary: string
}

const SYSTEM_PROMPT = `You parse search queries for an FDA medical device adverse event database.
The database contains manufacturers and medical devices. Device names follow FDA inverted naming convention (e.g. "PUMP, INFUSION, INSULIN", "CATHETER, CARDIOVASCULAR", "STENT, CORONARY").

Return ONLY valid JSON, no markdown:
{
  "entity_type": "manufacturer" | "device" | "both",
  "keywords": string[],
  "risk_tier": "HIGH" | "MEDIUM" | "LOW" | null,
  "has_deaths": true | false | null,
  "sort_by": "events" | "risk" | "recalls" | null,
  "summary": "Plain English summary of what was searched, max 80 chars"
}

Rules for "keywords" (2–5 individual words):
- Split multi-word phrases into individual words: "insulin pump" → ["insulin", "pump"]
- Add relevant synonyms/related terms: "insulin pump" → ["insulin", "pump", "infusion"]
- Because FDA names are inverted, also include the main noun: "cardiac catheter" → ["catheter", "cardiac", "cardiovascular"]
- Company/brand names: keep as single token: "Medtronic" → ["medtronic"]
- Anatomical or device-category terms work well: "heart", "spinal", "glucose", "ventilator"
- Max 5 keywords total, each a single word (no spaces)`

// ── In-memory result cache (server-side, survives across requests in same process) ──
const CACHE_TTL = 5 * 60 * 1000 // 5 min
const resultCache = new Map<string, { data: object; ts: number }>()

function getCached(key: string): object | null {
  const entry = resultCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { resultCache.delete(key); return null }
  return entry.data
}

function setCached(key: string, data: object) {
  if (resultCache.size >= 200) {
    // Evict oldest entry
    let oldest = ''
    let oldestTs = Infinity
    resultCache.forEach((v, k) => { if (v.ts < oldestTs) { oldestTs = v.ts; oldest = k } })
    if (oldest) resultCache.delete(oldest)
  }
  resultCache.set(key, { data, ts: Date.now() })
}

// ── Helpers ──

async function parseIntent(query: string): Promise<SearchIntent> {
  const apiKey  = process.env.OPENAI_API_KEY
  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com').replace(/\/$/, '')
  const model   = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 150,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: query },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`)
  const data = await res.json()
  const text = (data.choices?.[0]?.message?.content ?? '').trim()
  return JSON.parse(text) as SearchIntent
}

/** Score a result by how many keywords appear as substrings in the entity name */
function score(result: SearchResult, keywords: string[]): number {
  const lkws = keywords.map((k) => k.toLowerCase())
  const text =
    result.kind === 'manufacturer'
      ? result.data.name.toLowerCase()
      : `${result.data.brand_name} ${result.data.generic_name}`.toLowerCase()
  return lkws.filter((kw) => text.includes(kw)).length
}

function dedup<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => { if (seen.has(item.id)) return false; seen.add(item.id); return true })
}

function sortResults(results: SearchResult[], keywords: string[], sortBy?: string): SearchResult[] {
  return results.slice().sort((a, b) => {
    const scoreDiff = score(b, keywords) - score(a, keywords)
    if (scoreDiff !== 0) return scoreDiff
    if (sortBy === 'risk') {
      const tierOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      return (tierOrder[a.data.risk_tier ?? 'LOW'] ?? 2) - (tierOrder[b.data.risk_tier ?? 'LOW'] ?? 2)
    }
    if (sortBy === 'recalls') return b.data.recall_count - a.data.recall_count
    return b.data.total_events - a.data.total_events
  })
}

// ── Fast prefix search (no AI) ──

async function prefixSearch(query: string): Promise<SearchResult[]> {
  const [mfrs, devs] = await Promise.all([searchManufacturers(query), searchDevices(query)])
  return [
    ...mfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
    ...devs.map((d) => ({ kind: 'device' as const, data: d })),
  ].sort((a, b) => b.data.total_events - a.data.total_events)
}

// ── Route handler ──

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  const fast  = req.nextUrl.searchParams.get('fast') === '1'

  if (!query.trim()) return NextResponse.json({ results: [], summary: '' })

  // Fast mode: skip AI, return prefix results immediately
  if (fast || !process.env.OPENAI_API_KEY) {
    const cacheKey = `fast:${query.toLowerCase()}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const results = await prefixSearch(query)
    const payload = { results: results.slice(0, 24), summary: `Results for "${query}"` }
    setCached(cacheKey, payload)
    return NextResponse.json(payload)
  }

  // NL mode: check cache first
  const cacheKey = `nl:${query.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    // Kick off AI parse + raw prefix search in parallel
    // This way Firestore queries don't wait for the AI call to finish
    const [intent, rawMfrs, rawDevs] = await Promise.all([
      parseIntent(query),
      searchManufacturers(query),
      searchDevices(query),
    ])

    const keywords = intent.keywords.slice(0, 5)

    // Now run keyword-specific searches (AI chose these)
    const kwMfrResults = intent.entity_type !== 'device'
      ? await Promise.all(keywords.map((k) => searchManufacturers(k))).then((r) => r.flat())
      : []
    const kwDevResults = intent.entity_type !== 'manufacturer'
      ? await Promise.all(keywords.map((k) => searchDevices(k))).then((r) => r.flat())
      : []

    // Merge raw prefix results with keyword results
    const mfrs = dedup([...rawMfrs, ...kwMfrResults])
    const devs = dedup([...rawDevs, ...kwDevResults])

    let results: SearchResult[] = [
      ...mfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
      ...devs.map((d) => ({ kind: 'device' as const, data: d })),
    ]

    if (intent.risk_tier) results = results.filter((r) => r.data.risk_tier === intent.risk_tier)
    if (intent.has_deaths === true) results = results.filter((r) => r.data.death_count > 0)

    results = sortResults(results, keywords, intent.sort_by)

    // Fallback to top entities when keyword search yields nothing but filters exist
    if (results.length === 0 && (intent.risk_tier || intent.has_deaths)) {
      const [topMfrs, topDevices] = await Promise.all([getTopManufacturers(50), getTopDevices(50)])
      let fallback: SearchResult[] = [
        ...topMfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
        ...topDevices.map((d) => ({ kind: 'device' as const, data: d })),
      ]
      if (intent.risk_tier) fallback = fallback.filter((r) => r.data.risk_tier === intent.risk_tier)
      if (intent.has_deaths === true) fallback = fallback.filter((r) => r.data.death_count > 0)
      results = fallback
    }

    const payload = { results: results.slice(0, 24), summary: intent.summary, intent }
    setCached(cacheKey, payload)
    return NextResponse.json(payload)
  } catch (err) {
    console.error('NL search error:', err)
    // Fallback to prefix search
    const results = await prefixSearch(query)
    return NextResponse.json({ results: results.slice(0, 24), summary: `Results for "${query}"` })
  }
}
