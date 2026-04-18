import { NextRequest, NextResponse } from 'next/server'

const FDA_BASE = 'https://api.fda.gov/device/event.json'
const LIMIT    = 10

interface FdaEvent {
  report_number:    string
  mdr_report_key:   string   // FDA internal key — maps to mdrfoi__id in CFMAUDE URLs
  date_received:    string
  event_type:       string
  product_problems?: string[]
  mdr_text?:        Array<{ text_type_code: string; text: string }>
  patient?:         Array<{ sequence_number_outcome?: string[] }>
  device?:          Array<{ brand_name?: string; generic_name?: string }>
}

export interface MaudeEvent {
  reportNumber: string
  mdrKey:       string   // mdr_report_key — use for accessdata.fda.gov detail URL
  date:         string
  eventType:    string
  problems:     string[]
  description:  string
  outcomes:     string[]
  brandName:    string
}

function formatDate(raw: string): string {
  if (!raw || raw.length < 8) return raw
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

// FDA narratives are stored in ALL CAPS — convert to readable sentence case
function toSentenceCase(text: string): string {
  if (!text) return text
  // Only convert if the text is predominantly uppercase
  const upper = (text.match(/[A-Z]/g) ?? []).length
  const lower = (text.match(/[a-z]/g) ?? []).length
  if (lower > upper) return text // already mixed case — leave it

  return text
    .toLowerCase()
    // Capitalize after sentence-ending punctuation
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase())
    // Re-uppercase FDA/medical acronyms that should stay caps
    .replace(/\b(fda|mdr|b\)\(6\)|iv\b|ct\b|mri\b|ecg|ekg|cpr|icu|er\b|us\b|id\b|lot\b|sn\b|ref\b|exp\b|po\b|mg\b|ml\b|mm\b|cc\b)/gi, (m) => m.toUpperCase())
}

function buildQuery(params: URLSearchParams): string | null {
  const problem      = params.get('problem')?.trim()
  const productCode  = params.get('productCode')?.trim()
  const manufacturerName = params.get('manufacturerName')?.trim()

  if (!problem) return null

  const escapedProblem = `"${problem.replace(/"/g, '\\"')}"`

  if (productCode) {
    return `device.device_report_product_code:"${productCode}"+AND+product_problems:${escapedProblem}`
  }
  if (manufacturerName) {
    // Truncate long names to avoid URL issues; FDA fuzzy matches short prefixes
    const name = manufacturerName.slice(0, 60).replace(/"/g, '\\"')
    return `device.manufacturer_d_name:"${name}"+AND+product_problems:${escapedProblem}`
  }
  return null
}

export async function GET(req: NextRequest) {
  const p     = req.nextUrl.searchParams
  const skip  = parseInt(p.get('skip') ?? '0', 10)
  const query = buildQuery(p)

  if (!query) {
    return NextResponse.json({ error: 'Missing required params: problem + (productCode|manufacturerName)' }, { status: 400 })
  }

  const url = `${FDA_BASE}?search=${query}&limit=${LIMIT}&skip=${skip}`

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next:   { revalidate: 3600 }, // cache 1h — FDA data doesn't change fast
    })

    if (!res.ok) {
      // FDA returns 404 when no results; treat as empty
      if (res.status === 404) return NextResponse.json({ events: [], total: 0 })
      return NextResponse.json({ error: `FDA API error ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const total: number = data.meta?.results?.total ?? 0

    const events: MaudeEvent[] = (data.results ?? []).map((r: FdaEvent) => {
      const desc = toSentenceCase(
        (r.mdr_text ?? [])
          .filter((t) => t.text_type_code?.toLowerCase().includes('description') || t.text_type_code?.toLowerCase().includes('event'))
          .map((t) => t.text ?? '')
          .filter(Boolean)
          .join(' ')
          .slice(0, 500),
      )

      const outcomes = Array.from(
        new Set(
          (r.patient ?? []).flatMap((pt) => pt.sequence_number_outcome ?? []).filter(Boolean),
        ),
      )

      return {
        reportNumber: r.report_number ?? '',
        mdrKey:       r.mdr_report_key ?? '',
        date:         formatDate(r.date_received ?? ''),
        eventType:    r.event_type ?? '',
        problems:     r.product_problems ?? [],
        description:  desc,
        outcomes,
        brandName:    r.device?.[0]?.brand_name ?? '',
      }
    })

    return NextResponse.json({ events, total })
  } catch (err) {
    console.error('FDA events API error:', err)
    return NextResponse.json({ error: 'Failed to fetch events from FDA' }, { status: 502 })
  }
}
