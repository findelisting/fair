import { expect, test } from '@playwright/test'
import { badgeKind, checkApiParams, INSIGHT_CARD_IDS, normalizeSummary, parseDashboardParams, trimComment } from '@/lib/dashboard'

// Slice 4 dashboard logic (ADR 0007, spec docs/specs/slice-4-dashboard.md).

test('P-1: defaults and fallbacks for page parameters', () => {
  expect(parseDashboardParams({})).toEqual({ view: 'product', id: 'dark-92', market: null, campaign: null })
  expect(parseDashboardParams({ view: 'collection' })).toEqual({ view: 'collection', id: 'vegan-creamy', market: null, campaign: null })
  expect(parseDashboardParams({ view: 'product', id: 'creamy-oat', market: 'AT', campaign: 'shelf-q4-2026' })).toEqual({
    view: 'product', id: 'creamy-oat', market: 'AT', campaign: 'shelf-q4-2026',
  })
  // Unknown values fall back; an id from the other view is not accepted.
  expect(parseDashboardParams({ view: 'x', id: "1'; drop table", market: 'ZZ', campaign: 'nope' })).toEqual({
    view: 'product', id: 'dark-92', market: null, campaign: null,
  })
  expect(parseDashboardParams({ view: 'collection', id: 'dark-92' }).id).toBe('vegan-creamy')
  expect(parseDashboardParams({ id: ['creamy-oat', 'dark-92'] }).id).toBe('creamy-oat')
  expect(parseDashboardParams({ market: '' }).market).toBeNull()
})

test('D-6: the API rejects anything outside the catalogue', () => {
  const q = (s: string) => checkApiParams(new URLSearchParams(s))
  expect(q('view=product&id=dark-92')).toEqual({ ok: true, params: { view: 'product', id: 'dark-92', market: null, campaign: null } })
  expect(q('view=collection&id=vegan-creamy&market=DE&campaign=influencer-q4-2026').ok).toBe(true)
  for (const bad of ['', 'view=product', 'view=product&id=nope', 'view=collection&id=dark-92', 'view=x&id=dark-92', 'view=product&id=dark-92&market=ZZ', 'view=product&id=dark-92&campaign=x']) {
    expect(q(bad).ok, bad).toBe(false)
  }
})

test('badge kind follows the live/synthetic split', () => {
  expect(badgeKind({ live: 3, synthetic: 0 })).toBe('live')
  expect(badgeKind({ live: 0, synthetic: 9 })).toBe('synthetic')
  expect(badgeKind({ live: 1, synthetic: 9 })).toBe('mixed')
  expect(badgeKind({ live: 0, synthetic: 0 })).toBe('synthetic')
})

test('normalizeSummary fills gaps so panels never crash on partial data', () => {
  const s = normalizeSummary({ scans: { total: { live: 2, synthetic: 5 } } })
  expect(s.scans.total).toEqual({ live: 2, synthetic: 5 })
  expect(s.scans.byDay).toEqual([])
  expect(s.feedback.recent).toEqual([])
  expect(s.web.total).toEqual({ sessions: 0, pageViews: 0, videoPlays: 0, shopClicks: 0 })
  expect(normalizeSummary(null).scans.total).toEqual({ live: 0, synthetic: 0 })
})

test('D-5: comments are cut to 140 characters', () => {
  expect(trimComment('short')).toBe('short')
  const long = 'a'.repeat(300)
  expect(trimComment(long)!.length).toBe(140)
  expect(trimComment(long)!.endsWith('…')).toBe(true)
  expect(trimComment(null)).toBeNull()
})

test('P-7: insight card ids are one per card kind and SKU', () => {
  for (const id of ['market-context:dark-92', 'ideas:creamy-oat', 'packaging:creamy-hazelnut']) expect(INSIGHT_CARD_IDS.has(id)).toBe(true)
  expect(INSIGHT_CARD_IDS.size).toBe(9)
  for (const bad of ['nope', 'market-context:nope', 'ideas:']) expect(INSIGHT_CARD_IDS.has(bad)).toBe(false)
})
