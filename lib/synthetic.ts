// Synthetic demo history (slice 5, ADR 0005). Pure and deterministic: same inputs, same rows.
// Shaped so the agent questions have clear answers (spec docs/specs/slice-5-synthetic-data.md):
// - Austria: the wrapper code d92-at leads scans;
// - feedback-page visits: the shelf talker leads;
// - Dark 92% feedback: bitterness leads.
// Every row is marked source = 'synthetic'; web_aggregates is synthetic by table.
import { seedPayload } from './catalog'
import { TASTE_NOTES, type Theme } from './themes'

export const SYNTHETIC_DAYS = 60
const SEED = 20261126

export interface SyntheticScan {
  ts: string
  code_id: string
  sku_id: string | null
  collection_id: string | null
  campaign_id: string
  market: string
  device_type: 'mobile' | 'tablet' | 'desktop'
  language: string
  is_bot: false
  source: 'synthetic'
}
export interface SyntheticPageView {
  ts: string
  page: 'product' | 'feedback' | 'collection'
  sku_id: string | null
  collection_id: string | null
  campaign_id: string
  market: string
  source: 'synthetic'
}
export interface SyntheticFeedback {
  ts: string
  sku_id: string
  campaign_id: string
  market: string
  rating: number
  taste_note: string
  free_text: string | null
  themes: Theme[]
  source: 'synthetic'
}
export interface SyntheticWebAggregate {
  day: string
  sku_id: string
  campaign_id: string
  market: string
  sessions: number
  page_views: number
  video_plays: number
  shop_clicks: number
}
export interface SyntheticData {
  scan_events: SyntheticScan[]
  page_views: SyntheticPageView[]
  feedback: SyntheticFeedback[]
  web_aggregates: SyntheticWebAggregate[]
}

/** One anonymised example per theme, for the themes panel. */
export const THEME_EXAMPLES: Record<Theme, string> = {
  bitterness: 'Very intense at first, but the finish is smoother than I expected.',
  sweetness: 'Just sweet enough for an afternoon square with coffee.',
  texture: 'Melts slowly and feels creamy, even without milk.',
  packaging: 'The wrapper stood out on the shelf, so I picked it up.',
  origin: 'I liked reading where the bar is made.',
}

const FREE_TEXT: Record<Theme, string[]> = {
  bitterness: [THEME_EXAMPLES.bitterness, 'A bit too strong for me on its own.', 'Great with a glass of red wine.'],
  sweetness: [THEME_EXAMPLES.sweetness, 'Could be a little less sweet.'],
  texture: [THEME_EXAMPLES.texture, 'Slightly grainy at room temperature.'],
  packaging: [THEME_EXAMPLES.packaging, 'Nice colours, easy to open.'],
  origin: [THEME_EXAMPLES.origin, 'Good to see the bar is made in Ghana.'],
}

// Daily scan rate per code, before weekend and noise.
const SCAN_RATE: Record<string, number> = { 'd92-at': 14, 'oat-de': 9, 'haz-ch': 6, 'fb-d92': 5, 'vc-de': 7 }

const THEME_WEIGHTS: Record<string, Record<Theme, number>> = {
  'dark-92': { bitterness: 45, origin: 20, packaging: 15, texture: 12, sweetness: 8 },
  'creamy-oat': { texture: 40, sweetness: 25, packaging: 15, origin: 10, bitterness: 10 },
  'creamy-hazelnut': { sweetness: 35, texture: 30, packaging: 15, origin: 15, bitterness: 5 },
}

const RATING: Record<string, [number, number]> = {
  'too-bitter': [2, 3],
  'nicely-intense': [4, 5],
  'too-sweet': [2, 3],
  'not-sweet-enough': [3, 4],
  'smooth-creamy': [4, 5],
  'grainy-waxy': [2, 3],
  'love-wrapper': [4, 5],
  'origin-story': [4, 5],
}

const LANGUAGES: Record<string, string[]> = {
  DE: ['de-DE'], AT: ['de-AT'], CH: ['de-CH', 'de-CH', 'fr-CH'], FR: ['fr-FR'], UK: ['en-GB'],
  GH: ['en-GH'], CZ: ['cs-CZ'], SK: ['sk-SK'],
}

// Website metrics: markets per SKU, sessions per campaign, and a market factor.
const WEB_MARKETS: Record<string, string[]> = {
  'dark-92': ['DE', 'AT', 'CH', 'UK'],
  'creamy-oat': ['DE', 'AT', 'FR'],
  'creamy-hazelnut': ['DE', 'CH', 'CZ', 'SK'],
}
const WEB_SESSIONS: Record<string, number> = { 'wrapper-2026': 40, 'shelf-q4-2026': 22, 'influencer-q4-2026': 30, 'trade-fair-2027': 10 }
const MARKET_FACTOR: Record<string, number> = { DE: 1.6, AT: 1, CH: 0.9, FR: 0.7, UK: 0.6, GH: 0.3, CZ: 0.4, SK: 0.3 }

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Today's date in Europe/Berlin as YYYY-MM-DD. */
export function berlinToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function generateSynthetic({ today, now }: { today: string; now: Date }): SyntheticData {
  const rand = mulberry32(SEED)
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]
  const chance = (p: number) => rand() < p
  const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1))
  const weighted = <K extends string>(w: Record<K, number>): K => {
    const entries = Object.entries(w) as [K, number][]
    let r = rand() * entries.reduce((s, [, v]) => s + v, 0)
    for (const [k, v] of entries) if ((r -= v) < 0) return k
    return entries[entries.length - 1][0]
  }
  // Poisson-like count around a mean, never negative.
  const around = (mean: number) => Math.max(0, Math.round(mean * (0.7 + rand() * 0.6)))

  const campaigns = new Map(seedPayload.campaigns.map((c) => [c.id, c]))
  const active = (campaignId: string, day: string) => {
    const c = campaigns.get(campaignId)!
    return c.starts_on <= day && day <= c.ends_on
  }
  const membersOf = (collectionId: string) =>
    seedPayload.collection_skus.filter((cs) => cs.collection_id === collectionId).map((cs) => cs.sku_id)

  const out: SyntheticData = { scan_events: [], page_views: [], feedback: [], web_aggregates: [] }
  const nowMs = now.getTime()
  // A time on the given day, 06:00 to 20:59 UTC (07:00 to 21:59 Berlin in winter), plus a few minutes offset.
  const stamp = (day: string, base?: number, plusMinutes = 0): number =>
    base !== undefined
      ? base + plusMinutes * 60_000
      : Date.parse(`${day}T00:00:00Z`) + (between(6, 20) * 60 + between(0, 59)) * 60_000 + between(0, 59) * 1000
  const iso = (ms: number) => new Date(ms).toISOString()

  for (let i = 0; i < SYNTHETIC_DAYS; i++) {
    const day = addDays(today, -(SYNTHETIC_DAYS - 1) + i)
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
    const weekend = weekday === 0 || weekday === 6 ? 1.3 : 1

    // Scans, and the page views and feedback that follow them.
    for (const code of seedPayload.codes) {
      if (code.status !== 'active' || !active(code.campaign_id, day)) continue
      const n = around((SCAN_RATE[code.id] ?? 3) * weekend)
      for (let k = 0; k < n; k++) {
        const t = stamp(day)
        if (t > nowMs) continue
        out.scan_events.push({
          ts: iso(t),
          code_id: code.id,
          sku_id: code.sku_id,
          collection_id: code.collection_id,
          campaign_id: code.campaign_id,
          market: code.market,
          device_type: chance(0.85) ? 'mobile' : chance(0.55) ? 'tablet' : 'desktop',
          language: pick(LANGUAGES[code.market] ?? ['en']),
          is_bot: false,
          source: 'synthetic',
        })
        const ctx = { campaign_id: code.campaign_id, market: code.market, source: 'synthetic' as const }

        // Which product page (if any) the visitor lands on.
        let sku: string | null = null
        let at = t + 1000
        if (code.target_type === 'collection') {
          out.page_views.push({ ts: iso(at), page: 'collection', sku_id: null, collection_id: code.collection_id, ...ctx })
          if (chance(0.4)) sku = pick(membersOf(code.collection_id!))
        } else if (code.target_type === 'product' && chance(0.92)) {
          sku = code.sku_id
        }
        if (sku) {
          at += between(20, 90) * 1000
          if (at <= nowMs) out.page_views.push({ ts: iso(at), page: 'product', sku_id: sku, collection_id: null, ...ctx })
        }

        // Feedback page: always for feedback codes, sometimes after a product page.
        const fbSku = code.target_type === 'feedback' ? code.sku_id : sku && chance(0.08) ? sku : null
        if (!fbSku) continue
        at += between(30, 180) * 1000
        if (at > nowMs) continue
        out.page_views.push({ ts: iso(at), page: 'feedback', sku_id: fbSku, collection_id: null, ...ctx })
        if (!chance(0.35)) continue
        at += between(40, 240) * 1000
        if (at > nowMs) continue
        const theme = weighted(THEME_WEIGHTS[fbSku])
        const note = pick(TASTE_NOTES.filter((n) => n.theme === theme))
        const [lo, hi] = RATING[note.value] ?? [3, 4]
        out.feedback.push({
          ts: iso(at),
          sku_id: fbSku,
          campaign_id: code.campaign_id,
          market: code.market,
          rating: between(lo, hi),
          taste_note: note.value,
          free_text: chance(0.3) ? pick(FREE_TEXT[theme]) : null,
          themes: [theme],
          source: 'synthetic',
        })
      }
    }

    // Website aggregates: one row per SKU, active campaign and market.
    for (const sku of seedPayload.skus) {
      for (const campaign of seedPayload.campaigns) {
        if (!active(campaign.id, day)) continue
        const markets = campaign.channel === 'trade_fair' ? ['DE'] : WEB_MARKETS[sku.id] ?? []
        for (const market of markets) {
          const sessions = around((WEB_SESSIONS[campaign.id] ?? 10) * (MARKET_FACTOR[market] ?? 0.5) * weekend)
          out.web_aggregates.push({
            day,
            sku_id: sku.id,
            campaign_id: campaign.id,
            market,
            sessions,
            page_views: sessions + around(sessions * 1.3),
            video_plays: around(sessions * (campaign.channel === 'influencer' ? 0.32 : 0.15)),
            shop_clicks: around(sessions * 0.06),
          })
        }
      }
    }
  }

  // Rows are generated per code within a day; sort by time so the history reads naturally.
  const byTs = (a: { ts: string }, b: { ts: string }) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0)
  out.scan_events.sort(byTs)
  out.page_views.sort(byTs)
  out.feedback.sort(byTs)
  return out
}
