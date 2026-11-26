import { expect, test } from '@playwright/test'
import { generateSynthetic, THEME_EXAMPLES } from '@/lib/synthetic'
import { seedPayload } from '@/lib/catalog'
import { THEMES, TASTE_NOTES } from '@/lib/themes'
import { findClaimWords } from '@/lib/insights'

// Slice 5 (ADR 0005, spec docs/specs/slice-5-synthetic-data.md).
const today = '2026-11-26'
const now = new Date('2026-11-26T11:00:00Z')
const data = generateSynthetic({ today, now })

const countBy = <T,>(rows: T[], key: (r: T) => string) => {
  const m = new Map<string, number>()
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

test('S-1: same inputs give the same rows', () => {
  expect(JSON.stringify(generateSynthetic({ today, now }))).toBe(JSON.stringify(data))
})

test('S-2: 60 days ending today, nothing after now, nothing before a campaign starts', () => {
  const start = new Map(seedPayload.campaigns.map((c) => [c.id, c.starts_on]))
  const first = '2026-09-28'
  const bad = [...data.scan_events, ...data.page_views, ...data.feedback].filter(
    (r) => Date.parse(r.ts) > now.getTime() || r.ts.slice(0, 10) < first || (r.campaign_id && r.ts.slice(0, 10) < start.get(r.campaign_id)!),
  )
  expect(bad).toEqual([])
  const days = new Set(data.web_aggregates.map((w) => w.day))
  expect([...days].sort()[0]).toBe(first)
  expect([...days].sort().pop()).toBe(today)
  expect(data.web_aggregates.filter((w) => w.day < start.get(w.campaign_id)!)).toEqual([])
  expect(data.scan_events.some((s) => s.ts.startsWith(today))).toBe(true)
})

test('S-3: every row is synthetic and matches the catalogue', () => {
  const codes = new Map(seedPayload.codes.map((c) => [c.id, c]))
  const skus = new Set(seedPayload.skus.map((s) => s.id))
  const markets = new Set(seedPayload.markets.map((m) => m.code))
  const campaigns = new Set(seedPayload.campaigns.map((c) => c.id))
  const badScans = data.scan_events.filter((s) => {
    const c = codes.get(s.code_id)
    return !c || s.sku_id !== c.sku_id || s.collection_id !== c.collection_id || s.campaign_id !== c.campaign_id ||
      s.market !== c.market || s.source !== 'synthetic' || s.is_bot !== false
  })
  expect(badScans).toEqual([])
  const badRows = [...data.page_views, ...data.feedback].filter(
    (r) => r.source !== 'synthetic' || (r.sku_id && !skus.has(r.sku_id)) || !markets.has(r.market) || !campaigns.has(r.campaign_id),
  )
  expect(badRows).toEqual([])
  expect(data.web_aggregates.filter((w) => !(skus.has(w.sku_id) && markets.has(w.market) && campaigns.has(w.campaign_id)))).toEqual([])
})

test('S-4: in Austria the wrapper code clearly leads', () => {
  const at = countBy(data.scan_events.filter((s) => s.market === 'AT'), (s) => s.code_id)
  expect(at[0][0]).toBe('d92-at')
  expect(at[0][1]).toBeGreaterThanOrEqual(at[1][1] * 1.5)
})

test('S-5: the shelf talker drives feedback-page visits', () => {
  const fb = countBy(data.page_views.filter((p) => p.page === 'feedback'), (p) => p.campaign_id ?? '')
  expect(fb[0][0]).toBe('shelf-q4-2026')
  expect(fb[0][1]).toBeGreaterThanOrEqual(fb[1][1] * 2)
})

test('S-6: bitterness leads for the 92% bar', () => {
  const t = countBy(data.feedback.filter((f) => f.sku_id === 'dark-92'), (f) => f.themes[0])
  expect(t[0][0]).toBe('bitterness')
  expect(t[0][1]).toBeGreaterThanOrEqual(t[1][1] * 1.5)
})

test('S-7: feedback uses the form choices and stays clean', () => {
  const notes = new Map(TASTE_NOTES.map((n) => [n.value, n.theme]))
  for (const f of data.feedback) {
    expect(f.themes).toEqual([notes.get(f.taste_note)])
    expect(f.rating).toBeGreaterThanOrEqual(1)
    expect(f.rating).toBeLessThanOrEqual(5)
    if (f.free_text) {
      expect(findClaimWords(f.free_text)).toEqual([])
      expect(f.free_text.startsWith('[e2e]')).toBe(false)
      expect(f.free_text.length).toBeLessThanOrEqual(500)
    }
  }
  for (const s of data.scan_events) expect(s.language).not.toBe('x-e2e')
  expect(new Set(data.feedback.map((f) => f.sku_id)).size).toBe(3)
})

test('S-8: one clean example per theme', () => {
  for (const t of THEMES) {
    expect(THEME_EXAMPLES[t].length).toBeGreaterThan(10)
    expect(findClaimWords(THEME_EXAMPLES[t])).toEqual([])
  }
})

test('S-9: web aggregates have unique keys and sane numbers', () => {
  const keys = new Set(data.web_aggregates.map((w) => `${w.day}|${w.sku_id}|${w.campaign_id}|${w.market}`))
  expect(keys.size).toBe(data.web_aggregates.length)
  expect(data.web_aggregates.filter((w) => w.sessions < 0 || w.page_views < w.sessions || w.video_plays < 0 || w.shop_clicks < 0)).toEqual([])
})

test('S-10: payload stays a sensible size', () => {
  const total = data.scan_events.length + data.page_views.length + data.feedback.length + data.web_aggregates.length
  expect(total).toBeLessThan(12000)
  expect(data.feedback.length).toBeGreaterThan(60)
})
