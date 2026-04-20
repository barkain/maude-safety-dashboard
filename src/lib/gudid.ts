/**
 * GUDID (Global Unique Device Identification Database) integration
 * via openFDA device/udi endpoint — no API key required.
 *
 * Used to enrich device pages with consumer-relevant product info:
 * availability, Rx/OTC status, MRI safety, single-use, sterility, etc.
 */

const FDA_UDI = 'https://api.fda.gov/device/udi.json'

export interface GudidDevice {
  brand_name: string
  company_name: string
  device_description: string
  version_or_model_number: string | null
  catalog_number: string | null
  commercial_distribution_status: string   // "In Commercial Distribution" | "Not in Commercial Distribution" | …
  is_rx: boolean
  is_otc: boolean
  is_single_use: boolean
  is_implantable: boolean
  mri_safety: string   // "MR Safe" | "MR Conditional" | "MR Unsafe" | "Labeling does not contain…"
  is_sterile: boolean
  is_sterilization_prior_use: boolean
  is_labeled_as_nrl: boolean              // contains natural rubber latex
  premarket_submissions: { submission_number: string }[]
  publish_date: string | null
}

interface RawUdiResult {
  brand_name?: string
  company_name?: string
  device_description?: string
  version_or_model_number?: string
  catalog_number?: string
  commercial_distribution_status?: string
  is_rx?: string | boolean
  is_otc?: string | boolean
  is_single_use?: string | boolean
  mri_safety?: string
  sterilization?: { is_sterile?: string | boolean; is_sterilization_prior_use?: string | boolean }
  is_labeled_as_nrl?: string | boolean
  premarket_submissions?: { submission_number: string }[]
  publish_date?: string
  record_status?: string
  product_codes?: { code: string; name: string }[]
}

function asBool(v: string | boolean | undefined): boolean {
  if (v === undefined || v === null) return false
  if (typeof v === 'boolean') return v
  return v === 'true'
}

function normalise(raw: RawUdiResult): GudidDevice {
  return {
    brand_name:                   raw.brand_name ?? '',
    company_name:                 raw.company_name ?? '',
    device_description:           raw.device_description ?? '',
    version_or_model_number:      raw.version_or_model_number ?? null,
    catalog_number:               raw.catalog_number ?? null,
    commercial_distribution_status: raw.commercial_distribution_status ?? '',
    is_rx:                        asBool(raw.is_rx),
    is_otc:                       asBool(raw.is_otc),
    is_single_use:                asBool(raw.is_single_use),
    is_implantable:               false,           // not in UDI endpoint; derived from product code if needed
    mri_safety:                   raw.mri_safety ?? '',
    is_sterile:                   asBool(raw.sterilization?.is_sterile),
    is_sterilization_prior_use:   asBool(raw.sterilization?.is_sterilization_prior_use),
    is_labeled_as_nrl:            asBool(raw.is_labeled_as_nrl),
    premarket_submissions:        raw.premarket_submissions ?? [],
    publish_date:                 raw.publish_date ?? null,
  }
}

/**
 * Fetch the best-matching GUDID record for a device.
 * Searches by brand name, then falls back to generic name if no match.
 * Returns null on any error or no match.
 */
export async function fetchGudidDevice(
  brandName: string,
  genericName?: string,
): Promise<GudidDevice | null> {
  const attempts = [brandName, genericName].filter(Boolean) as string[]

  for (const term of attempts) {
    // Quote exact phrase; openFDA supports Lucene-style phrase search
    const encoded = encodeURIComponent(`"${term}"`)
    const url = `${FDA_UDI}?search=brand_name:${encoded}&limit=5`

    try {
      const res = await fetch(url, {
        next: { revalidate: 86400 },          // cache 24 h
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue

      const data = await res.json()
      const results: RawUdiResult[] = data?.results ?? []
      if (results.length === 0) continue

      // Prefer "In Commercial Distribution" records; fall back to first result
      const active = results.find(
        (r) => r.commercial_distribution_status === 'In Commercial Distribution',
      )
      return normalise(active ?? results[0])
    } catch {
      continue
    }
  }

  return null
}
