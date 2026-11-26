// Competitor references and improvement hypotheses (BUILD_PLAN.md slice 7, ADR 0001).
// Plain TypeScript with no JSX, so the Playwright unit runner can test it.
// The JSON is checked when this module loads: a bad entry fails `next build` and the unit tests,
// not the live demo.
import competitorsJson from '@/data/competitors.json'
import hypothesesJson from '@/data/hypotheses.json'

export interface CompetitorSource {
  publisher: string
  url: string
  /** ISO date (YYYY-MM-DD) the source was read. */
  accessedOn: string
}

export interface CompetitorValue {
  label: string
  value: string
  /** Key into the product's `sources`. */
  source: string
}

export interface CompetitorProduct {
  id: string
  brand: string
  product: string
  market: string
  /** Demo SKU id this product is compared with. */
  comparesTo: string
  sources: Record<string, CompetitorSource>
  values: CompetitorValue[]
}

export interface Hypothesis {
  id: string
  statement: string
  /** Named metrics the hypothesis rests on. */
  basis: string[]
}

/** Claim words kept out of the demo (APPROACH.md section 10). */
export const BANNED_CLAIM_WORDS = ['climate', 'carbon', 'co2', 'neutral', 'certified', 'certification', 'compliant', 'compliance']

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/** Returns a list of problems; an empty list means the data is valid. */
export function checkCompetitors(data: unknown, today: Date = new Date()): string[] {
  const errors: string[] = []
  const products = (data as { products?: unknown })?.products
  if (!Array.isArray(products) || products.length === 0) return ['competitors: "products" must be a non-empty array']

  const todayIso = today.toISOString().slice(0, 10)
  for (const [i, p] of (products as Partial<CompetitorProduct>[]).entries()) {
    const at = `competitors[${i}]${p?.id ? ` (${p.id})` : ''}`
    for (const field of ['id', 'brand', 'product', 'market', 'comparesTo'] as const) {
      if (!isNonEmptyString(p?.[field])) errors.push(`${at}: missing ${field}`)
    }
    const sources = p?.sources ?? {}
    if (typeof sources !== 'object' || Object.keys(sources).length === 0) errors.push(`${at}: no sources`)
    for (const [key, s] of Object.entries(sources as Record<string, Partial<CompetitorSource>>)) {
      if (!isNonEmptyString(s?.publisher)) errors.push(`${at}: source "${key}" has no publisher`)
      let url: URL | null = null
      try {
        url = new URL(String(s?.url))
      } catch {
        /* reported below */
      }
      if (!url || url.protocol !== 'https:') errors.push(`${at}: source "${key}" needs an https URL`)
      if (!isNonEmptyString(s?.accessedOn) || !ISO_DATE.test(s.accessedOn) || Number.isNaN(Date.parse(s.accessedOn))) {
        errors.push(`${at}: source "${key}" needs an accessedOn date (YYYY-MM-DD)`)
      } else if (s.accessedOn > todayIso) {
        errors.push(`${at}: source "${key}" has an accessedOn date in the future`)
      }
    }
    if (!Array.isArray(p?.values) || p.values.length === 0) errors.push(`${at}: no values`)
    for (const [j, v] of (p?.values ?? []).entries()) {
      if (!isNonEmptyString(v?.label) || !isNonEmptyString(v?.value)) errors.push(`${at}: value ${j} needs a label and a value`)
      if (!isNonEmptyString(v?.source) || !(v.source in (sources as object))) {
        errors.push(`${at}: value "${v?.label ?? j}" points to an unknown source`)
      }
    }
  }
  return errors
}

export function checkHypotheses(data: unknown): string[] {
  const errors: string[] = []
  const list = (data as { hypotheses?: unknown })?.hypotheses
  if (!Array.isArray(list) || list.length === 0) return ['hypotheses: "hypotheses" must be a non-empty array']
  for (const [i, h] of (list as Partial<Hypothesis>[]).entries()) {
    const at = `hypotheses[${i}]${h?.id ? ` (${h.id})` : ''}`
    if (!isNonEmptyString(h?.id)) errors.push(`${at}: missing id`)
    if (!isNonEmptyString(h?.statement)) errors.push(`${at}: missing statement`)
    if (!Array.isArray(h?.basis) || h.basis.length === 0 || !h.basis.every(isNonEmptyString)) {
      errors.push(`${at}: needs a data basis`)
    }
  }
  return errors
}

/** Finds banned claim words anywhere in the given data. */
export function findClaimWords(data: unknown): string[] {
  const text = JSON.stringify(data).toLowerCase()
  return BANNED_CLAIM_WORDS.filter((w) => new RegExp(`\\b${w}\\b`).test(text))
}

function load<T>(name: string, data: unknown, check: (d: unknown) => string[]): T {
  const errors = [...check(data), ...findClaimWords(data).map((w) => `${name}: banned claim word "${w}"`)]
  if (errors.length > 0) throw new Error(`Invalid ${name} data:\n- ${errors.join('\n- ')}`)
  return data as T
}

export const competitors: CompetitorProduct[] = load<{ products: CompetitorProduct[] }>(
  'competitors',
  competitorsJson,
  checkCompetitors,
).products

export const hypotheses: Hypothesis[] = load<{ hypotheses: Hypothesis[] }>('hypotheses', hypothesesJson, checkHypotheses).hypotheses

/** "2026-11-26" -> "26 Nov 2026", fixed to UTC so server and tests agree. */
export function formatAccessDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
