// Competitor references and improvement hypotheses (BUILD_PLAN.md slice 7, ADR 0001).
// Plain TypeScript with no JSX, so the Playwright unit runner can test it.
// The JSON is checked when this module loads: a bad entry fails `next build` and the unit tests,
// not the live demo.
import competitorsJson from '@/data/competitors.json'
import hypothesesJson from '@/data/hypotheses.json'
import packagingJson from '@/data/packaging.json'

export interface CompetitorSource {
  publisher: string
  url: string
  /** ISO date (YYYY-MM-DD) the source was read. */
  accessedOn: string
  /** True when values come from a search result, not the page itself. Prices then show with "~". */
  estimate?: boolean
}

/** A related product or approach, shown as a link only, with no values. */
export interface ExploreLink {
  label: string
  url: string
  comparesTo: string
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
  /** Demo SKU id the hypothesis belongs to. */
  sku: string
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
  const explore = (data as { explore?: unknown })?.explore ?? []
  if (!Array.isArray(explore)) errors.push('competitors: "explore" must be an array')
  else
    for (const [i, e] of (explore as Partial<ExploreLink>[]).entries()) {
      if (!isNonEmptyString(e?.label) || !isNonEmptyString(e?.comparesTo)) errors.push(`explore[${i}]: needs a label and comparesTo`)
      if (!isHttps(e?.url)) errors.push(`explore[${i}]: needs an https URL`)
    }
  return errors
}

function isHttps(v: unknown): boolean {
  try {
    return new URL(String(v)).protocol === 'https:'
  } catch {
    return false
  }
}

export function checkHypotheses(data: unknown): string[] {
  const errors: string[] = []
  const list = (data as { hypotheses?: unknown })?.hypotheses
  if (!Array.isArray(list) || list.length === 0) return ['hypotheses: "hypotheses" must be a non-empty array']
  for (const [i, h] of (list as Partial<Hypothesis>[]).entries()) {
    const at = `hypotheses[${i}]${h?.id ? ` (${h.id})` : ''}`
    if (!isNonEmptyString(h?.id)) errors.push(`${at}: missing id`)
    if (!isNonEmptyString(h?.sku)) errors.push(`${at}: missing sku`)
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

const competitorData = load<{ products: CompetitorProduct[]; explore?: ExploreLink[] }>('competitors', competitorsJson, checkCompetitors)

export const competitors: CompetitorProduct[] = competitorData.products
export const exploreLinks: ExploreLink[] = competitorData.explore ?? []
export const hypotheses: Hypothesis[] = load<{ hypotheses: Hypothesis[] }>('hypotheses', hypothesesJson, checkHypotheses).hypotheses

export interface PackagingSource {
  publisher: string
  /** One-line takeaway from the source. */
  note: string
  url: string
  accessedOn: string
}

export interface PackagingIdea {
  id: string
  /** Demo SKU id, or "all" for every product. */
  sku: string
  statement: string
  basis: string[]
  sources: PackagingSource[]
}

export function checkPackaging(data: unknown, today: Date = new Date()): string[] {
  const errors: string[] = []
  const list = (data as { ideas?: unknown })?.ideas
  if (!Array.isArray(list) || list.length === 0) return ['packaging: "ideas" must be a non-empty array']
  const todayIso = today.toISOString().slice(0, 10)
  for (const [i, idea] of (list as Partial<PackagingIdea>[]).entries()) {
    const at = `packaging[${i}]${idea?.id ? ` (${idea.id})` : ''}`
    for (const field of ['id', 'sku', 'statement'] as const) {
      if (!isNonEmptyString(idea?.[field])) errors.push(`${at}: missing ${field}`)
    }
    if (!Array.isArray(idea?.basis) || idea.basis.length === 0 || !idea.basis.every(isNonEmptyString)) {
      errors.push(`${at}: needs a data basis`)
    }
    if (!Array.isArray(idea?.sources)) errors.push(`${at}: "sources" must be an array`)
    for (const [j, s] of (idea?.sources ?? []).entries()) {
      if (!isNonEmptyString(s?.publisher) || !isNonEmptyString(s?.note)) errors.push(`${at}: source ${j} needs a publisher and a note`)
      if (!isHttps(s?.url)) errors.push(`${at}: source ${j} needs an https URL`)
      if (!isNonEmptyString(s?.accessedOn) || !ISO_DATE.test(s.accessedOn) || s.accessedOn > todayIso) {
        errors.push(`${at}: source ${j} needs a past accessedOn date (YYYY-MM-DD)`)
      }
    }
  }
  return errors
}

export const packagingIdeas: PackagingIdea[] = load<{ ideas: PackagingIdea[] }>('packaging', packagingJson, checkPackaging).ideas

/** Packaging ideas for one SKU: its own plus those for "all". */
export function packagingFor(sku?: string): PackagingIdea[] {
  return packagingIdeas.filter((i) => !sku || i.sku === 'all' || i.sku === sku)
}

/** Market context for one SKU (the product view), or everything when no SKU is given. */
export function insightsFor(sku?: string) {
  const match = (id: string) => !sku || id === sku
  return {
    products: competitors.filter((p) => match(p.comparesTo)),
    explore: exploreLinks.filter((e) => match(e.comparesTo)),
    hypotheses: hypotheses.filter((h) => match(h.sku)),
  }
}

/** Display text for a value: prices from search results get a "~" to mark them as estimates. */
export function displayValue(p: CompetitorProduct, v: CompetitorValue): string {
  const estimate = p.sources[v.source]?.estimate && v.value.trim().startsWith('€')
  return estimate ? `~${v.value}` : v.value
}

/** One-line summary for the collapsed row: "~€5.09 / 100 g". */
export function snippetLine(p: CompetitorProduct): string {
  const price = p.values.find((v) => v.label === 'Price')
  const size = p.values.find((v) => v.label === 'Pack size')
  return [price && displayValue(p, price), size?.value].filter(Boolean).join(' / ')
}

/** "2026-11-26" -> "26 Nov 2026", fixed to UTC so server and tests agree. */
export function formatAccessDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
