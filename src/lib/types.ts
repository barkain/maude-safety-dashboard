import type { Timestamp } from 'firebase/firestore'

// ── Shared risk types ────────────────────────────────────────────────────────
export type RiskTier = 'HIGH' | 'MEDIUM' | 'LOW'
export type EventRateTrend = 'INCREASING' | 'STABLE' | 'DECREASING' | 'UNKNOWN'

// ── Firestore document: manufacturers/{mfr_id} ──────────────────────────────
export interface Manufacturer {
  id: string
  name: string                                    // normalized display name
  country: string
  total_events: number
  death_count: number
  injury_count: number
  malfunction_count: number
  recall_count: number
  recall_rate: number                             // 0-1
  severity_score: number
  events_by_month: Record<string, number>         // "2025-01": 42
  top_devices: Array<{ id: string; name: string; count: number }>
  device_classes: Record<string, number>          // "Class 2": 450
  specialties: string[]
  last_updated: Timestamp | null
  // ── Predictive / supply chain fields ────────────────────────────────────
  supply_chain_risk_score: number                 // 0–10
  supply_chain_summary: string                    // narrative text
  countries: string[]
  risk_tier: RiskTier
  recall_risk_score: number                       // 0–1
  projected_event_rate_trend: EventRateTrend
}

// ── Firestore document: devices/{device_id} ──────────────────────────────────
export interface Device {
  id: string
  manufacturer_id: string
  manufacturer_name: string
  brand_name: string
  generic_name: string
  product_code: string
  device_class: string
  medical_specialty: string
  total_events: number
  death_count: number
  injury_count: number
  malfunction_count: number
  recall_count: number
  recall_rate: number
  severity_score: number
  events_by_month: Record<string, number>
  top_problems: string[]
  last_updated: Timestamp | null
  // ── Predictive fields ───────────────────────────────────────────────────
  recall_risk_score: number                       // 0–1
  risk_tier: RiskTier
  projected_event_rate_trend: EventRateTrend
}

// ── UI-level helpers ──────────────────────────────────────────────────────────
export type SeverityLevel = 'death' | 'injury' | 'malfunction' | 'other'

export interface MonthlyDataPoint {
  month: string   // "Jan 25"
  events: number
}

export interface SeveritySlice {
  name: string
  value: number
  fill: string
}

export type SearchResult =
  | { kind: 'manufacturer'; data: Manufacturer }
  | { kind: 'device';       data: Device }
