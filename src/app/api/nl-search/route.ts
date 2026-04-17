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

async function parseIntent(query: string): Promise<SearchIntent> {
  const apiKey  = process.env.OPENAI_API_KEY
  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com').replace(/\/$/, '')
  const model   = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
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

/** Score a result by how many of the keywords appear as substrings in the entity name */
function score(result: SearchResult, keywords: string[]): number {
  const lkws = keywords.map((k) => k.toLowerCase())
  const text =
    result.kind === 'manufacturer'
      ? result.data.name.toLowerCase()
      : `${result.data.brand_name} ${result.data.generic_name}`.toLowerCase()
  return lkws.filter((kw) => text.includes(kw)).length
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  if (!query.trim()) return NextResponse.json({ results: [], summary: '' })

  if (process.env.OPENAI_API_KEY) {
    try {
      const intent = await parseIntent(query)
      const keywords = intent.keywords.slice(0, 5)

      // Run prefix searches for all keywords in parallel across both entity types
      const [mfrResults, deviceResults] = await Promise.all([
        intent.entity_type !== 'device'
          ? Promise.all(keywords.map((k) => searchManufacturers(k))).then((r) => r.flat())
          : Promise.resolve([]),
        intent.entity_type !== 'manufacturer'
          ? Promise.all(keywords.map((k) => searchDevices(k))).then((r) => r.flat())
          : Promise.resolve([]),
      ])

      // Deduplicate
      const seenMfr = new Set<string>()
      const mfrs = mfrResults.filter((m) => { if (seenMfr.has(m.id)) return false; seenMfr.add(m.id); return true })
      const seenDev = new Set<string>()
      const devs = deviceResults.filter((d) => { if (seenDev.has(d.id)) return false; seenDev.add(d.id); return true })

      let results: SearchResult[] = [
        ...mfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
        ...devs.map((d) => ({ kind: 'device' as const, data: d })),
      ]

      // Apply filters
      if (intent.risk_tier) results = results.filter((r) => r.data.risk_tier === intent.risk_tier)
      if (intent.has_deaths === true) results = results.filter((r) => r.data.death_count > 0)

      // Sort: primary = keyword relevance score DESC, secondary = total_events DESC
      results.sort((a, b) => {
        const scoreDiff = score(b, keywords) - score(a, keywords)
        if (scoreDiff !== 0) return scoreDiff
        if (intent.sort_by === 'risk') {
          const tierOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
          return (tierOrder[a.data.risk_tier ?? 'LOW'] ?? 2) - (tierOrder[b.data.risk_tier ?? 'LOW'] ?? 2)
        }
        if (intent.sort_by === 'recalls') return b.data.recall_count - a.data.recall_count
        return b.data.total_events - a.data.total_events
      })

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

      return NextResponse.json({ results: results.slice(0, 24), summary: intent.summary, intent })
    } catch (err) {
      console.error('NL search error:', err)
      // fall through to prefix search
    }
  }

  // Prefix search fallback (no API key or NL parse failed)
  const [mfrs, devs] = await Promise.all([searchManufacturers(query), searchDevices(query)])
  const results: SearchResult[] = [
    ...mfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
    ...devs.map((d) => ({ kind: 'device' as const, data: d })),
  ].sort((a, b) => b.data.total_events - a.data.total_events)

  return NextResponse.json({ results: results.slice(0, 24), summary: `Results for "${query}"` })
}
