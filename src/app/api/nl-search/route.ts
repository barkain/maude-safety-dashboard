import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  searchManufacturers,
  searchDevices,
  getTopManufacturers,
  getTopDevices,
} from '@/lib/firestore'
import type { SearchResult } from '@/lib/types'

// Claude parses the query into a structured intent object
interface SearchIntent {
  entity_type: 'manufacturer' | 'device' | 'both'
  keywords: string[]          // terms to search for
  risk_tier?: 'HIGH' | 'MEDIUM' | 'LOW'
  has_deaths?: boolean        // filter for devices/mfrs with death_count > 0
  specialty?: string          // medical specialty hint
  sort_by?: 'events' | 'risk' | 'recalls'
  summary: string             // human-readable interpretation to show in UI
}

const client = new Anthropic()

async function parseIntent(query: string): Promise<SearchIntent> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are a search query parser for an FDA medical device adverse event database.

Parse this search query into a structured JSON intent. The database contains:
- Manufacturers (companies that make medical devices)
- Devices (individual medical device models with brand names and generic names)
- Each has: total_events, death_count, injury_count, recall_count, recall_rate, risk_tier (HIGH/MEDIUM/LOW), severity_score

Query: "${query}"

Respond with ONLY valid JSON (no markdown), with these fields:
{
  "entity_type": "manufacturer" | "device" | "both",
  "keywords": ["keyword1", "keyword2"],   // 1-3 key terms to search on
  "risk_tier": "HIGH" | "MEDIUM" | "LOW" | null,
  "has_deaths": true | false | null,
  "specialty": "cardiology" | "neurology" | "diabetes" | etc | null,
  "sort_by": "events" | "risk" | "recalls" | null,
  "summary": "Plain English summary of what was searched for (max 80 chars)"
}`,
      },
    ],
  })

  const text = (message.content[0] as { type: string; text: string }).text.trim()
  return JSON.parse(text) as SearchIntent
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  if (!query.trim()) {
    return NextResponse.json({ results: [], summary: '' })
  }

  // If no API key, fall back to regular prefix search
  if (!process.env.ANTHROPIC_API_KEY) {
    const [mfrs, devices] = await Promise.all([
      searchManufacturers(query),
      searchDevices(query),
    ])
    const results: SearchResult[] = [
      ...mfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
      ...devices.map((d) => ({ kind: 'device' as const, data: d })),
    ].sort((a, b) => b.data.total_events - a.data.total_events)
    return NextResponse.json({ results: results.slice(0, 20), summary: `Results for "${query}"` })
  }

  try {
    const intent = await parseIntent(query)

    // Fetch candidates based on keywords
    const searchTerms = intent.keywords.slice(0, 2)

    const [mfrResults, deviceResults] = await Promise.all([
      intent.entity_type !== 'device'
        ? Promise.all(searchTerms.map((k) => searchManufacturers(k))).then((r) => r.flat())
        : Promise.resolve([]),
      intent.entity_type !== 'manufacturer'
        ? Promise.all(searchTerms.map((k) => searchDevices(k))).then((r) => r.flat())
        : Promise.resolve([]),
    ])

    // Deduplicate
    const seenMfr = new Set<string>()
    const mfrs = mfrResults.filter((m) => { if (seenMfr.has(m.id)) return false; seenMfr.add(m.id); return true })

    const seenDev = new Set<string>()
    const devices = deviceResults.filter((d) => { if (seenDev.has(d.id)) return false; seenDev.add(d.id); return true })

    // Build results, applying intent filters
    let results: SearchResult[] = [
      ...mfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
      ...devices.map((d) => ({ kind: 'device' as const, data: d })),
    ]

    // Apply risk tier filter
    if (intent.risk_tier) {
      results = results.filter((r) => r.data.risk_tier === intent.risk_tier)
    }

    // Apply deaths filter
    if (intent.has_deaths === true) {
      results = results.filter((r) => r.data.death_count > 0)
    }

    // Sort
    if (intent.sort_by === 'risk') {
      results.sort((a, b) => {
        const tierOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        return (tierOrder[a.data.risk_tier ?? 'LOW'] ?? 2) - (tierOrder[b.data.risk_tier ?? 'LOW'] ?? 2)
      })
    } else if (intent.sort_by === 'recalls') {
      results.sort((a, b) => b.data.recall_count - a.data.recall_count)
    } else {
      results.sort((a, b) => b.data.total_events - a.data.total_events)
    }

    // If no keyword results but we have filters, fall back to top entities
    if (results.length === 0 && (intent.risk_tier || intent.has_deaths)) {
      const [topMfrs, topDevices] = await Promise.all([
        getTopManufacturers(50),
        getTopDevices(50),
      ])
      let fallback: SearchResult[] = [
        ...topMfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
        ...topDevices.map((d) => ({ kind: 'device' as const, data: d })),
      ]
      if (intent.risk_tier) fallback = fallback.filter((r) => r.data.risk_tier === intent.risk_tier)
      if (intent.has_deaths === true) fallback = fallback.filter((r) => r.data.death_count > 0)
      results = fallback
    }

    return NextResponse.json({
      results: results.slice(0, 20),
      summary: intent.summary,
      intent,
    })
  } catch (err) {
    console.error('NL search error:', err)
    // Graceful fallback to prefix search
    const [mfrs, devices] = await Promise.all([
      searchManufacturers(query),
      searchDevices(query),
    ])
    const results: SearchResult[] = [
      ...mfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
      ...devices.map((d) => ({ kind: 'device' as const, data: d })),
    ].sort((a, b) => b.data.total_events - a.data.total_events)
    return NextResponse.json({ results: results.slice(0, 20), summary: `Results for "${query}"` })
  }
}
