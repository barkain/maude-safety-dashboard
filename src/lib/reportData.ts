/**
 * Data helpers for the Procurement Report feature.
 * Used exclusively by /report/device/[id] — Server Component only.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit as fsLimit,
  getDocs,
  type DocumentData,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { Device } from './types'

function snapToDevice(snap: DocumentData, id: string): Device {
  return { id, ...snap } as Device
}

/**
 * Find up to 3 alternative devices in the same medical specialty,
 * excluding the focal device and any device from the same manufacturer.
 * Falls back to product_code match if specialty yields <2 results.
 */
export async function getAlternativeDevices(device: Device): Promise<Device[]> {
  const results: Device[] = []
  const seen = new Set<string>()

  // Primary: same medical_specialty, sorted by total_events desc
  if (device.medical_specialty) {
    const q = query(
      collection(getDb(), 'devices'),
      where('medical_specialty', '==', device.medical_specialty),
      orderBy('total_events', 'desc'),
      fsLimit(12),
    )
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      if (d.id === device.id) continue
      const dev = snapToDevice(d.data(), d.id)
      // Exclude same manufacturer and duplicates
      if (dev.manufacturer_id === device.manufacturer_id) continue
      if (seen.has(d.id)) continue
      seen.add(d.id)
      results.push(dev)
      if (results.length >= 3) break
    }
  }

  // Fallback: same product_code (same device type, different manufacturers)
  if (results.length < 2 && device.product_code) {
    const q = query(
      collection(getDb(), 'devices'),
      where('product_code', '==', device.product_code),
      orderBy('total_events', 'desc'),
      fsLimit(10),
    )
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      if (d.id === device.id) continue
      const dev = snapToDevice(d.data(), d.id)
      if (dev.manufacturer_id === device.manufacturer_id) continue
      if (seen.has(d.id)) continue
      seen.add(d.id)
      results.push(dev)
      if (results.length >= 3) break
    }
  }

  return results.slice(0, 3)
}

/**
 * Generate a 3–4 sentence plain-English incident summary for a VAC audience.
 * Uses the OpenAI-compatible endpoint (Claude API or configured model).
 * Returns null if no API key is configured or on any error.
 * Cached 24 h via Next.js fetch cache.
 */
export async function generateIncidentSummary(device: Device): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com'
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  if (!apiKey) return null

  const topProblems = device.top_problems.slice(0, 8)
  const problemList = topProblems
    .map((p) => (typeof p === 'string' ? p : (p as { problem: string }).problem))
    .join(', ')

  const riskTier = device.risk_tier ?? 'UNKNOWN'
  const deathRate =
    device.total_events > 0
      ? ((device.death_count / device.total_events) * 100).toFixed(1)
      : '0'
  const injuryRate =
    device.total_events > 0
      ? ((device.injury_count / device.total_events) * 100).toFixed(1)
      : '0'

  const prompt = `You are a medical device safety analyst writing for a hospital Value Analysis Committee (VAC). Summarize the adverse event profile of this device in 3-4 sentences. Be factual and direct. Do not use the word "significant". Do not hedge with "it is important to note". Focus on the key safety concerns a procurement team needs to know.

Device: ${device.brand_name} (${device.generic_name})
Manufacturer: ${device.manufacturer_name}
Risk Tier: ${riskTier}
Total adverse events in dataset: ${device.total_events.toLocaleString()}
Deaths: ${device.death_count} (${deathRate}% of events)
Injuries: ${device.injury_count} (${injuryRate}% of events)
Malfunctions: ${device.malfunction_count}
Recalls: ${device.recall_count}
Top reported problems: ${problemList || 'None recorded'}

Write only the 3–4 sentence summary. No preamble, no headers.`

  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are a medical device safety analyst. Write concise, factual summaries for hospital procurement staff. No marketing language. No disclaimers.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      // @ts-expect-error — Next.js extended fetch option
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}
