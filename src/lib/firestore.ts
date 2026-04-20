import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { Manufacturer, Device } from './types'
import { MOCK_MANUFACTURERS, MOCK_DEVICES } from './mockData'

// ── helpers ───────────────────────────────────────────────────────────────────
const USE_MOCK = !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
                 process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'your-project-id'

function snapToManufacturer(snap: DocumentData, id: string): Manufacturer {
  return { id, ...snap } as Manufacturer
}

function snapToDevice(snap: DocumentData, id: string): Device {
  return { id, ...snap } as Device
}

// ── Manufacturers ─────────────────────────────────────────────────────────────

export async function getTopManufacturers(n = 10): Promise<Manufacturer[]> {
  if (USE_MOCK) return MOCK_MANUFACTURERS.slice(0, n)
  try {
    const q = query(
      collection(getDb(), 'manufacturers'),
      orderBy('total_events', 'desc'),
      fsLimit(n),
    )
    const snap: QuerySnapshot = await getDocs(q)
    return snap.docs.map((d) => snapToManufacturer(d.data(), d.id))
  } catch {
    return MOCK_MANUFACTURERS.slice(0, n)
  }
}

export async function getManufacturer(id: string): Promise<Manufacturer | null> {
  if (USE_MOCK) return MOCK_MANUFACTURERS.find((m) => m.id === id) ?? null
  try {
    const ref  = doc(getDb(), 'manufacturers', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snapToManufacturer(snap.data(), snap.id)
  } catch {
    return MOCK_MANUFACTURERS.find((m) => m.id === id) ?? null
  }
}

export async function searchManufacturers(queryStr: string): Promise<Manufacturer[]> {
  if (USE_MOCK) {
    const q = queryStr.toLowerCase()
    return MOCK_MANUFACTURERS.filter((m) => m.name.toLowerCase().includes(q))
  }

  // Firestore doesn't support full-text search natively.
  // Production path: use a Cloud Function / Algolia / Typesense index.
  // Fallback: prefix match on lowercase name field (requires normalized field).
  const lower = queryStr.toLowerCase()
  try {
    const q = query(
      collection(getDb(), 'manufacturers'),
      where('name_lower', '>=', lower),
      where('name_lower', '<=', lower + '\uf8ff'),
      fsLimit(20),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => snapToManufacturer(d.data(), d.id))
  } catch {
    return MOCK_MANUFACTURERS.filter((m) => m.name.toLowerCase().includes(lower))
  }
}

/** Fetch top manufacturers ranked by recall_risk_score descending */
export async function getTopRiskManufacturers(n = 50): Promise<Manufacturer[]> {
  if (USE_MOCK) {
    return [...MOCK_MANUFACTURERS]
      .sort((a, b) => (b.recall_risk_score ?? 0) - (a.recall_risk_score ?? 0))
      .slice(0, n)
  }
  try {
    const q = query(
      collection(getDb(), 'manufacturers'),
      orderBy('recall_risk_score', 'desc'),
      fsLimit(n),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => snapToManufacturer(d.data(), d.id))
  } catch {
    return [...MOCK_MANUFACTURERS]
      .sort((a, b) => (b.recall_risk_score ?? 0) - (a.recall_risk_score ?? 0))
      .slice(0, n)
  }
}

/** Fetch top devices ranked by recall_risk_score descending */
export async function getTopRiskDevices(n = 50): Promise<Device[]> {
  if (USE_MOCK) {
    return [...MOCK_DEVICES]
      .sort((a, b) => (b.recall_risk_score ?? 0) - (a.recall_risk_score ?? 0))
      .slice(0, n)
  }
  try {
    const q = query(
      collection(getDb(), 'devices'),
      orderBy('recall_risk_score', 'desc'),
      fsLimit(n),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => snapToDevice(d.data(), d.id))
  } catch {
    return [...MOCK_DEVICES]
      .sort((a, b) => (b.recall_risk_score ?? 0) - (a.recall_risk_score ?? 0))
      .slice(0, n)
  }
}

/** Fetch manufacturers with HIGH risk tier, sorted by total_events desc */
export async function getHighRiskManufacturers(n = 6): Promise<Manufacturer[]> {
  if (USE_MOCK) return MOCK_MANUFACTURERS.filter((m) => m.risk_tier === 'HIGH').slice(0, n)
  try {
    const q = query(
      collection(getDb(), 'manufacturers'),
      where('risk_tier', '==', 'HIGH'),
      fsLimit(50),
    )
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => snapToManufacturer(d.data(), d.id))
      .sort((a, b) => b.total_events - a.total_events)
      .slice(0, n)
  } catch {
    return MOCK_MANUFACTURERS.filter((m) => m.risk_tier === 'HIGH').slice(0, n)
  }
}

/** Fetch devices with HIGH risk tier, sorted by total_events desc */
export async function getHighRiskDevices(n = 6): Promise<Device[]> {
  if (USE_MOCK) return MOCK_DEVICES.filter((d) => d.risk_tier === 'HIGH').slice(0, n)
  try {
    const q = query(
      collection(getDb(), 'devices'),
      where('risk_tier', '==', 'HIGH'),
      fsLimit(50),
    )
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => snapToDevice(d.data(), d.id))
      .sort((a, b) => b.total_events - a.total_events)
      .slice(0, n)
  } catch {
    return MOCK_DEVICES.filter((d) => d.risk_tier === 'HIGH').slice(0, n)
  }
}

// ── Devices ───────────────────────────────────────────────────────────────────

export async function getTopDevices(n = 10): Promise<Device[]> {
  if (USE_MOCK) return MOCK_DEVICES.slice(0, n)
  try {
    const q = query(
      collection(getDb(), 'devices'),
      orderBy('total_events', 'desc'),
      fsLimit(n),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => snapToDevice(d.data(), d.id))
  } catch {
    return MOCK_DEVICES.slice(0, n)
  }
}

export async function getDevice(id: string): Promise<Device | null> {
  if (USE_MOCK) return MOCK_DEVICES.find((d) => d.id === id) ?? null
  try {
    const ref  = doc(getDb(), 'devices', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snapToDevice(snap.data(), snap.id)
  } catch {
    return MOCK_DEVICES.find((d) => d.id === id) ?? null
  }
}

export async function searchDevices(queryStr: string): Promise<Device[]> {
  if (USE_MOCK) {
    const q = queryStr.toLowerCase()
    return MOCK_DEVICES.filter(
      (d) =>
        d.generic_name.toLowerCase().includes(q) ||
        d.brand_name.toLowerCase().includes(q),
    )
  }

  // Run parallel prefix-match queries on brand_name_lower and generic_name_lower,
  // then merge + deduplicate so searches like "insulin pump" find generic-name matches.
  const lower = queryStr.toLowerCase()
  const makeQuery = (field: string) =>
    getDocs(
      query(
        collection(getDb(), 'devices'),
        where(field, '>=', lower),
        where(field, '<=', lower + '\uf8ff'),
        fsLimit(15),
      ),
    )

  try {
    const [brandSnap, genericSnap] = await Promise.all([
      makeQuery('brand_name_lower'),
      makeQuery('generic_name_lower'),
    ])

    const seen = new Set<string>()
    const results: Device[] = []
    for (const snap of [brandSnap, genericSnap]) {
      for (const d of snap.docs) {
        if (!seen.has(d.id)) {
          seen.add(d.id)
          results.push(snapToDevice(d.data(), d.id))
        }
      }
    }
    return results.slice(0, 20)
  } catch {
    const q = queryStr.toLowerCase()
    return MOCK_DEVICES.filter(
      (d) =>
        d.generic_name.toLowerCase().includes(q) ||
        d.brand_name.toLowerCase().includes(q),
    )
  }
}
