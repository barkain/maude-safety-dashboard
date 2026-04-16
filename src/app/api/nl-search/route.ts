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

const SYSTEM_PROMPT = `You are a search query parser for an FDA medical device adverse event database.
The database contains manufacturers and devices. Each has total_events, death_count, injury_count, recall_count, recall_rate, risk_tier (HIGH/MEDIUM/LOW), severity_score.
Parse the user query into a JSON object. Respond with ONLY valid JSON, no markdown:
{
  "entity_type": "manufacturer" | "device" | "both",
  "keywords": ["keyword1", "keyword2"],
  "risk_tier": "HIGH" | "MEDIUM" | "LOW" | null,
  "has_deaths": true | false | null,
  "sort_by": "events" | "risk" | "recalls" | null,
  "summary": "Plain English summary of what was searched (max 80 chars)"
}`

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

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const text = (data.choices?.[0]?.message?.content ?? '').trim()
  return JSON.parse(text) as SearchIntent
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  if (!query.trim()) {
    return NextResponse.json({ results: [], summary: '' })
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const intent = await parseIntent(query)
      const searchTerms = intent.keywords.slice(0, 2)

      const [mfrResults, deviceResults] = await Promise.all([
        intent.entity_type !== 'device'
          ? Promise.all(searchTerms.map((k) => searchManufacturers(k))).then((r) => r.flat())
          : Promise.resolve([]),
        intent.entity_type !== 'manufacturer'
          ? Promise.all(searchTerms.map((k) => searchDevices(k))).then((r) => r.flat())
          : Promise.resolve([]),
      ])

      const seenMfr = new Set<string>()
      const mfrs = mfrResults.filter((m) => { if (seenMfr.has(m.id)) return false; seenMfr.add(m.id); return true })
      const seenDev = new Set<string>()
      const devices = deviceResults.filter((d) => { if (seenDev.has(d.id)) return false; seenDev.add(d.id); return true })

      let results: SearchResult[] = [
        ...mfrs.map((m) => ({ kind: 'manufacturer' as const, data: m })),
        ...devices.map((d) => ({ kind: 'device' as const, data: d })),
      ]

      if (intent.risk_tier) results = results.filter((r) => r.data.risk_tier === intent.risk_tier)
      if (intent.has_deaths === true) results = results.filter((r) => r.data.death_count > 0)

      if (intent.sort_by === 'risk') {
        const tierOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        results.sort((a, b) => (tierOrder[a.data.risk_tier ?? 'LOW'] ?? 2) - (tierOrder[b.data.risk_tier ?? 'LOW'] ?? 2))
      } else if (intent.sort_by === 'recalls') {
        results.sort((a, b) => b.data.recall_count - a.data.recall_count)
      } else {
        results.sort((a, b) => b.data.total_events - a.data.total_events)
      }

      // If keyword search gave nothing but we have filters, fallback to top entities
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

      return NextResponse.json({ results: results.slice(0, 20), summary: intent.summary, intent })
    } catch (err) {
      console.error('NL search error:', err)
      // fall through to prefix search
    }
  }

  // Prefix search fallback (no API key or NL parse failed)
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
