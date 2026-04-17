export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import {
  searchManufacturers,
  searchDevices,
  getTopManufacturers,
  getTopDevices,
} from '@/lib/firestore'
import type { SearchResult } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Query classifier — decides whether we need LLM at all
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Phrases that imply the user wants structured filters (risk tier, death flag,
 * sort order, geography, etc.) — things a pure keyword search can't handle.
 * Keep this list tight; false-positives send simple queries through the LLM path.
 */
const NL_TRIGGERS = [
  'high risk', 'low risk', 'medium risk', 'high-risk',
  'with death', 'with recall', 'with injur', 'with malfunction',
  'recalled',
  'sort by', 'ranked', 'most dangerous', 'worst', 'highest risk',
  'compare', ' vs ', ' versus ',
]

/** Question-word patterns that signal free-form natural language */
const QUESTION_RE = /^(what|which|show|find|list|how many|are there|give me)\b/i

function needsLLM(query: string): boolean {
  const q = query.toLowerCase()
  if (NL_TRIGGERS.some((t) => q.includes(t))) return true
  if (QUESTION_RE.test(q.trim())) return true
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Tokenizer
// ─────────────────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'of', 'for', 'in', 'with', 'to',
  'is', 'are', 'was', 'be', 'by', 'on', 'at', 'from',
])

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    .slice(0, 6)
}

// ─────────────────────────────────────────────────────────────────────────────
// BM25-style relevance scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a result against the query tokens.
 * Weights:
 *  +1.0  per token that appears anywhere in the name
 *  +0.5  bonus if it's a whole-word match
 *  +0.3  bonus if the name starts with the token (prefix = higher specificity)
 *  −0.001 × name length (shorter names are more specific matches)
 */
function relevanceScore(result: SearchResult, tokens: string[]): number {
  const text =
    result.kind === 'manufacturer'
      ? result.data.name.toLowerCase()
      : `${result.data.brand_name} ${result.data.generic_name}`.toLowerCase()

  let sc = 0
  for (const tok of tokens) {
    if (!text.includes(tok)) continue
    sc += 1.0
    if (new RegExp(`\\b${tok}\\b`).test(text)) sc += 0.5
    if (text.startsWith(tok)) sc += 0.3
  }
  sc -= text.length * 0.001 // slight specificity bonus for shorter names
  return sc
}

function sortByRelevance(
  results: SearchResult[],
  tokens: string[],
  sortBy?: string,
): SearchResult[] {
  return results.slice().sort((a, b) => {
    const diff = relevanceScore(b, tokens) - relevanceScore(a, tokens)
    if (diff !== 0) return diff
    if (sortBy === 'risk') {
      const ord: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      return (ord[a.data.risk_tier ?? 'LOW'] ?? 2) - (ord[b.data.risk_tier ?? 'LOW'] ?? 2)
    }
    if (sortBy === 'recalls') return b.data.recall_count - a.data.recall_count
    return b.data.total_events - a.data.total_events
  })
}

function dedup<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((i) => { if (seen.has(i.id)) return false; seen.add(i.id); return true })
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword search (no LLM)
// ─────────────────────────────────────────────────────────────────────────────

async function keywordSearch(query: string): Promise<{ results: SearchResult[]; summary: string }> {
  const tokens = tokenize(query)
  const terms  = tokens.length > 0 ? tokens : [query.toLowerCase().trim()]

  const [mfrResults, devResults] = await Promise.all([
    Promise.all(terms.map(searchManufacturers)).then((r) => r.flat()),
    Promise.all(terms.map(searchDevices)).then((r) => r.flat()),
  ])

  const results = sortByRelevance(
    [
      ...dedup(mfrResults).map((m) => ({ kind: 'manufacturer' as const, data: m })),
      ...dedup(devResults).map((d) => ({ kind: 'device' as const, data: d })),
    ],
    tokens,
  )

  return { results: results.slice(0, 24), summary: `Results for "${query}"` }
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM intent parsing
// ─────────────────────────────────────────────────────────────────────────────

interface SearchIntent {
  entity_type: 'manufacturer' | 'device' | 'both'
  keywords: string[]
  risk_tier?: 'HIGH' | 'MEDIUM' | 'LOW'
  has_deaths?: boolean
  sort_by?: 'events' | 'risk' | 'recalls'
  summary: string
}

const SYSTEM_PROMPT = `You parse search queries for an FDA medical device adverse event database.
Device names follow FDA inverted convention (e.g. "PUMP, INFUSION, INSULIN", "CATHETER, CARDIOVASCULAR").

Return ONLY valid JSON, no markdown:
{
  "entity_type": "manufacturer" | "device" | "both",
  "keywords": string[],
  "risk_tier": "HIGH" | "MEDIUM" | "LOW" | null,
  "has_deaths": true | false | null,
  "sort_by": "events" | "risk" | "recalls" | null,
  "summary": "Plain English summary, max 80 chars"
}

keywords: 2–5 individual words. Split phrases ("insulin pump" → ["insulin","pump"]). Add synonyms ("pump" → also "infusion"). Max 5 words, no phrases.`

async function parseIntent(query: string): Promise<SearchIntent> {
  const apiKey  = process.env.OPENAI_API_KEY!
  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com').replace(/\/$/, '')
  const model   = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, max_tokens: 150, temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: query },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  return JSON.parse((data.choices?.[0]?.message?.content ?? '').trim()) as SearchIntent
}

async function nlSearch(query: string): Promise<{ results: SearchResult[]; summary: string; intent: SearchIntent }> {
  const tokens = tokenize(query)

  // Start LLM parse and raw prefix search in parallel
  const [intent, rawMfrs, rawDevs] = await Promise.all([
    parseIntent(query),
    searchManufacturers(query),
    searchDevices(query),
  ])

  const keywords = intent.keywords.slice(0, 5)

  // Run AI-chosen keyword searches (entity-type filtered)
  const [kwMfrs, kwDevs] = await Promise.all([
    intent.entity_type !== 'device'
      ? Promise.all(keywords.map(searchManufacturers)).then((r) => r.flat())
      : Promise.resolve([]),
    intent.entity_type !== 'manufacturer'
      ? Promise.all(keywords.map(searchDevices)).then((r) => r.flat())
      : Promise.resolve([]),
  ])

  let results: SearchResult[] = [
    ...dedup([...rawMfrs, ...kwMfrs]).map((m) => ({ kind: 'manufacturer' as const, data: m })),
    ...dedup([...rawDevs, ...kwDevs]).map((d) => ({ kind: 'device' as const, data: d })),
  ]

  if (intent.risk_tier)        results = results.filter((r) => r.data.risk_tier === intent.risk_tier)
  if (intent.has_deaths === true) results = results.filter((r) => r.data.death_count > 0)

  results = sortByRelevance(results, [...tokens, ...keywords], intent.sort_by)

  // Filter-only fallback: no keyword matches but filters given
  if (results.length === 0 && (intent.risk_tier || intent.has_deaths)) {
    const [topM, topD] = await Promise.all([getTopManufacturers(50), getTopDevices(50)])
    let fb: SearchResult[] = [
      ...topM.map((m) => ({ kind: 'manufacturer' as const, data: m })),
      ...topD.map((d) => ({ kind: 'device' as const, data: d })),
    ]
    if (intent.risk_tier)           fb = fb.filter((r) => r.data.risk_tier === intent.risk_tier)
    if (intent.has_deaths === true) fb = fb.filter((r) => r.data.death_count > 0)
    results = fb
  }

  return { results: results.slice(0, 24), summary: intent.summary, intent }
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory result cache
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { data: object; ts: number }>()

function getCached(key: string): object | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.data
}

function setCached(key: string, data: object) {
  if (cache.size >= 200) {
    let oldest = '', oldestTs = Infinity
    cache.forEach((v, k) => { if (v.ts < oldestTs) { oldestTs = v.ts; oldest = k } })
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { data, ts: Date.now() })
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const fast  = req.nextUrl.searchParams.get('fast') === '1'
  if (!query) return NextResponse.json({ results: [], summary: '' })

  const cacheKey = `${fast ? 'fast' : needsLLM(query) ? 'nl' : 'kw'}:${query.toLowerCase()}`
  const cached   = getCached(cacheKey)
  if (cached) return NextResponse.json(cached)

  // Fast mode or simple keyword query — no LLM
  if (fast || !process.env.OPENAI_API_KEY || !needsLLM(query)) {
    const payload = await keywordSearch(query)
    setCached(cacheKey, payload)
    return NextResponse.json(payload)
  }

  // NL mode — LLM intent parsing
  try {
    const payload = await nlSearch(query)
    setCached(cacheKey, payload)
    return NextResponse.json(payload)
  } catch (err) {
    console.error('NL search error:', err)
    const payload = await keywordSearch(query)
    return NextResponse.json(payload)
  }
}
