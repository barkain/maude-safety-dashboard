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

  const q = query(
    collection(getDb(), 'manufacturers'),
    orderBy('total_events', 'desc'),
    fsLimit(n),
  )
  const snap: QuerySnapshot = await getDocs(q)
  return snap.docs.map((d) => snapToManufacturer(d.data(), d.id))
}

export async function getManufacturer(id: string): Promise<Manufacturer | null> {
  if (USE_MOCK) return MOCK_MANUFACTURERS.find((m) => m.id === id) ?? null

  const ref  = doc(getDb(), 'manufacturers', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snapToManufacturer(snap.data(), snap.id)
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
  const q = query(
    collection(getDb(), 'manufacturers'),
    where('name_lower', '>=', lower),
    where('name_lower', '<=', lower + '\uf8ff'),
    fsLimit(20),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapToManufacturer(d.data(), d.id))
}

// ── Devices ───────────────────────────────────────────────────────────────────

export async function getTopDevices(n = 10): Promise<Device[]> {
  if (USE_MOCK) return MOCK_DEVICES.slice(0, n)

  const q = query(
    collection(getDb(), 'devices'),
    orderBy('total_events', 'desc'),
    fsLimit(n),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapToDevice(d.data(), d.id))
}

export async function getDevice(id: string): Promise<Device | null> {
  if (USE_MOCK) return MOCK_DEVICES.find((d) => d.id === id) ?? null

  const ref  = doc(getDb(), 'devices', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snapToDevice(snap.data(), snap.id)
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

  // Same prefix-match approach for brand_name_lower
  const lower = queryStr.toLowerCase()
  const q = query(
    collection(getDb(), 'devices'),
    where('brand_name_lower', '>=', lower),
    where('brand_name_lower', '<=', lower + '\uf8ff'),
    fsLimit(20),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => snapToDevice(d.data(), d.id))
}
