// Dashboard logic without server or database (slice 4, ADR 0007). Unit-tested.
import { collectionById, isCampaign, isMarket, seedPayload, skuById } from './catalog'
import type { DataKind } from '@/components/DataBadge'
import type { EvidenceKind } from './evidence'

export type View = 'product' | 'collection'
export interface DashboardParams {
  view: View
  id: string
  market: string | null
  campaign: string | null
}

export interface Split {
  live: number
  synthetic: number
}
export interface KeyedSplit extends Split {
  key: string
}
export interface RecentFeedback {
  ts: string
  sku: string
  rating: number
  tasteNote: string
  freeText: string | null
  campaign: string | null
  market: string | null
}
export interface DashboardSummary {
  asOf: string
  scans: { total: Split; lastLive: string | null; byDay: KeyedSplit[]; byCampaign: KeyedSplit[]; byMarket: KeyedSplit[]; bySku: KeyedSplit[]; collectionCode: Split }
  pageViews: { byPage: KeyedSplit[] }
  feedback: { total: Split; avgRating: number | null; themes: KeyedSplit[]; recent: RecentFeedback[] }
  web: { total: { sessions: number; pageViews: number; videoPlays: number; shopClicks: number }; byDay: { key: string; sessions: number }[] }
}

const DEFAULT_SKU = seedPayload.skus[0].id
const DEFAULT_COLLECTION = seedPayload.collections[0].id

type Raw = string | string[] | undefined
const one = (v: Raw): string | undefined => (Array.isArray(v) ? v[0] : v) || undefined

/** P-1: page parameters with fallbacks; never throws. */
export function parseDashboardParams(sp: Record<string, Raw>): DashboardParams {
  const view: View = one(sp.view) === 'collection' ? 'collection' : 'product'
  const rawId = one(sp.id)
  const id =
    view === 'product'
      ? rawId && skuById(rawId) ? rawId : DEFAULT_SKU
      : rawId && collectionById(rawId) ? rawId : DEFAULT_COLLECTION
  const market = one(sp.market)
  const campaign = one(sp.campaign)
  return { view, id, market: market && isMarket(market) ? market : null, campaign: campaign && isCampaign(campaign) ? campaign : null }
}

/** D-6: API parameters must all be valid; no fallbacks. */
export function checkApiParams(q: URLSearchParams): { ok: true; params: DashboardParams } | { ok: false } {
  const view = q.get('view')
  const id = q.get('id')
  const market = q.get('market') || null
  const campaign = q.get('campaign') || null
  if (view !== 'product' && view !== 'collection') return { ok: false }
  if (!id || (view === 'product' ? !skuById(id) : !collectionById(id))) return { ok: false }
  if (market && !isMarket(market)) return { ok: false }
  if (campaign && !isCampaign(campaign)) return { ok: false }
  return { ok: true, params: { view, id, market, campaign } }
}

export function badgeKind(s: Split): DataKind {
  if (s.live > 0 && s.synthetic > 0) return 'mixed'
  return s.live > 0 ? 'live' : 'synthetic'
}

export function sumSplits(rows: Split[]): Split {
  return rows.reduce((a, r) => ({ live: a.live + r.live, synthetic: a.synthetic + r.synthetic }), { live: 0, synthetic: 0 })
}

export function trimComment(text: string | null | undefined, max = 140): string | null {
  if (!text) return null
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const split = (v: unknown): Split => {
  const o = (v ?? {}) as Record<string, unknown>
  return { live: num(o.live), synthetic: num(o.synthetic) }
}
const keyed = (v: unknown): KeyedSplit[] =>
  Array.isArray(v) ? v.map((r) => ({ key: String((r as Record<string, unknown>).key ?? ''), ...split(r) })) : []

/** Fills gaps so a partial or empty answer never crashes a panel. */
export function normalizeSummary(raw: unknown): DashboardSummary {
  const r = (raw ?? {}) as Record<string, Record<string, unknown> | undefined>
  const scans = r.scans ?? {}
  const pv = r.pageViews ?? {}
  const fb = r.feedback ?? {}
  const web = r.web ?? {}
  const wt = (web.total ?? {}) as Record<string, unknown>
  return {
    asOf: typeof r.asOf === 'string' ? (r.asOf as unknown as string) : new Date(0).toISOString(),
    scans: {
      total: split(scans.total),
      lastLive: typeof scans.lastLive === 'string' ? scans.lastLive : null,
      byDay: keyed(scans.byDay),
      byCampaign: keyed(scans.byCampaign),
      byMarket: keyed(scans.byMarket),
      bySku: keyed(scans.bySku),
      collectionCode: split(scans.collectionCode),
    },
    pageViews: { byPage: keyed(pv.byPage) },
    feedback: {
      total: split(fb.total),
      avgRating: fb.avgRating == null ? null : num(fb.avgRating),
      themes: keyed(fb.themes),
      recent: Array.isArray(fb.recent)
        ? (fb.recent as Record<string, unknown>[]).map((x) => ({
            ts: String(x.ts ?? ''),
            sku: String(x.sku ?? ''),
            rating: num(x.rating),
            tasteNote: String(x.tasteNote ?? ''),
            freeText: trimComment(typeof x.freeText === 'string' ? x.freeText : null),
            campaign: typeof x.campaign === 'string' ? x.campaign : null,
            market: typeof x.market === 'string' ? x.market : null,
          }))
        : [],
    },
    web: {
      total: { sessions: num(wt.sessions), pageViews: num(wt.pageViews), videoPlays: num(wt.videoPlays), shopClicks: num(wt.shopClicks) },
      byDay: Array.isArray(web.byDay) ? (web.byDay as Record<string, unknown>[]).map((d) => ({ key: String(d.key ?? ''), sessions: num(d.sessions) })) : [],
    },
  }
}

export function dashboardQuery(p: DashboardParams): string {
  const q = new URLSearchParams({ view: p.view, id: p.id })
  if (p.market) q.set('market', p.market)
  if (p.campaign) q.set('campaign', p.campaign)
  return q.toString()
}

/** P-7: one "Useful and accurate?" check per card kind and SKU. */
export const INSIGHT_CARD_KINDS = ['market-context', 'ideas', 'packaging'] as const
export type InsightCardKind = (typeof INSIGHT_CARD_KINDS)[number]
export const insightCardId = (kind: InsightCardKind, sku: string) => `${kind}:${sku}`
export const INSIGHT_CARD_IDS: ReadonlySet<string> = new Set(
  seedPayload.skus.flatMap((s) => INSIGHT_CARD_KINDS.map((k) => insightCardId(k, s.id))),
)

export const campaignName = (id: string) => seedPayload.campaigns.find((c) => c.id === id)?.name ?? id
export const marketName = (code: string) => seedPayload.markets.find((m) => m.code === code)?.name ?? code
export const skuName = (id: string) => skuById(id)?.name ?? id

// UX pass (ADR 0011): headline numbers, the live-scan moment, and which breakdowns to show.

export interface HeadlineNumber {
  id: 'scans' | 'visits' | 'shop' | 'feedback'
  label: string
  value: number
  kind: DataKind
  evidence: EvidenceKind
}

/** Four headline tiles for the selected product or collection. Each carries its data label and evidence tag. */
export function headlineNumbers(s: DashboardSummary): HeadlineNumber[] {
  const visits = sumSplits(s.pageViews.byPage)
  return [
    { id: 'scans', label: 'QR scans', value: s.scans.total.live + s.scans.total.synthetic, kind: badgeKind(s.scans.total), evidence: 'observed' },
    { id: 'visits', label: 'Page visits', value: visits.live + visits.synthetic, kind: badgeKind(visits), evidence: 'observed' },
    { id: 'shop', label: 'Shop clicks', value: s.web.total.shopClicks, kind: 'synthetic', evidence: 'attributed' },
    { id: 'feedback', label: 'Feedback answers', value: s.feedback.total.live + s.feedback.total.synthetic, kind: badgeKind(s.feedback.total), evidence: 'observed' },
  ]
}

export interface NewLiveScan {
  count: number
  market: string | null
  campaign: string | null
  sku: string | null
}

/** The first key whose live count went up between two polls. */
function grew(prev: KeyedSplit[], next: KeyedSplit[]): string | null {
  for (const r of next) {
    const before = prev.find((p) => p.key === r.key)?.live ?? 0
    if (r.live > before) return r.key
  }
  return null
}

/** What arrived live since the previous poll, from live counts only (never synthetic). Null when nothing new. */
export function newLiveScan(prev: DashboardSummary, next: DashboardSummary): NewLiveScan | null {
  const count = next.scans.total.live - prev.scans.total.live
  if (count <= 0) return null
  return {
    count,
    market: grew(prev.scans.byMarket, next.scans.byMarket),
    campaign: grew(prev.scans.byCampaign, next.scans.byCampaign),
    sku: grew(prev.scans.bySku, next.scans.bySku),
  }
}

/** A breakdown is hidden when its filter already leaves one value (it would repeat the total). */
export function breakdownsToShow(filters: { market: string | null; campaign: string | null }): { market: boolean; campaign: boolean } {
  return { market: !filters.market, campaign: !filters.campaign }
}
