export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import {
  searchManufacturers,
  searchDevices,
  getTopManufacturers,
  getTopDevices,
} from '@/lib/firestore'
import type { SearchResult } from '@/lib/types'
import { needsLLM } from '@/lib/nlTriggers'

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
    if (new RegExp(`\\b${escapeRegExp(tok)}\\b`).test(text)) sc += 0.5
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
// Stemming helpers — MAUDE uses singular inverted names ("VALVE, HEART")
// so "valves" would find nothing without de-pluralization
// ─────────────────────────────────────────────────────────────────────────────

function stems(term: string): string[] {
  const t: string[] = [term]
  if (term.endsWith('ies') && term.length > 5) t.push(term.slice(0, -3) + 'y') // arteries → artery
  if (term.endsWith('s') && term.length > 4 && !term.endsWith('ss')) t.push(term.slice(0, -1)) // valves → valve, pumps → pump
  return t.filter((v, i, a) => a.indexOf(v) === i)
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword search (no LLM)
// ─────────────────────────────────────────────────────────────────────────────

async function keywordSearch(query: string): Promise<{ results: SearchResult[]; summary: string }> {
  const tokens = tokenize(query)
  const terms  = tokens.length > 0 ? tokens : [query.toLowerCase().trim()]
  const expandedTerms = Array.from(new Set(terms.flatMap(stems)))

  const [mfrResults, devResults] = await Promise.all([
    Promise.all(expandedTerms.map(searchManufacturers)).then((r) => r.flat()),
    Promise.all(expandedTerms.map(searchDevices)).then((r) => r.flat()),
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
    signal: AbortSignal.timeout(8000),
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
  const expandedKeywords = Array.from(new Set(keywords.flatMap(stems)))

  // Run AI-chosen keyword searches (entity-type filtered), with stemming
  const [kwMfrs, kwDevs] = await Promise.all([
    intent.entity_type !== 'device'
      ? Promise.all(expandedKeywords.map(searchManufacturers)).then((r) => r.flat())
      : Promise.resolve([]),
    intent.entity_type !== 'manufacturer'
      ? Promise.all(expandedKeywords.map(searchDevices)).then((r) => r.flat())
      : Promise.resolve([]),
  ])

  // "Subject keywords" = device/mfr terms, excluding pure filter modifiers
  const FILTER_WORDS = new Set(['high', 'low', 'medium', 'risk', 'recall', 'recalls', 'death', 'deaths', 'injury', 'injuries'])
  const subjectKeywords = keywords.filter((kw) => !FILTER_WORDS.has(kw.toLowerCase()))
  const rawTokensSubject = tokens.filter((t) => !FILTER_WORDS.has(t))
  const allSearchTokens = [...rawTokensSubject, ...subjectKeywords]

  let results: SearchResult[] = [
    ...dedup([...rawMfrs, ...kwMfrs]).map((m) => ({ kind: 'manufacturer' as const, data: m })),
    ...dedup([...rawDevs, ...kwDevs]).map((d) => ({ kind: 'device' as const, data: d })),
  ]

  // Apply filters strictly — if the user asked for HIGH risk knee devices and there
  // are none in the DB, we return zero results (honest) rather than relaxing the filter.
  if (intent.risk_tier)            results = results.filter((r) => r.data.risk_tier === intent.risk_tier)
  if (intent.has_deaths === true)  results = results.filter((r) => r.data.death_count > 0)

  results = sortByRelevance(results, allSearchTokens, intent.sort_by)

  // Pure-filter fallback ONLY: query had no subject keywords (e.g. "show high risk manufacturers")
  // Never fall back when a subject keyword exists — wrong results are worse than no results.
  if (results.length === 0 && subjectKeywords.length === 0 && (intent.risk_tier || intent.has_deaths)) {
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
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const fast  = req.nextUrl.searchParams.get('fast') === '1'
  if (!query) return NextResponse.json({ results: [], summary: '' })

  // Fast mode or simple keyword query — no LLM
  if (fast || !process.env.OPENAI_API_KEY || !needsLLM(query)) {
    return NextResponse.json(await keywordSearch(query))
  }

  // NL mode — LLM intent parsing
  try {
    return NextResponse.json(await nlSearch(query))
  } catch (err) {
    console.error('NL search error:', err)
    return NextResponse.json(await keywordSearch(query))
  }
}
