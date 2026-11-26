import { expect, test } from '@playwright/test'
import { checkCompetitors, checkHypotheses, competitors, displayValue, findClaimWords, formatAccessDate, hypotheses, insightsFor, snippetLine, checkPackaging, packagingFor, type CompetitorProduct } from '@/lib/insights'
import competitorsJson from '@/data/competitors.json'
import hypothesesJson from '@/data/hypotheses.json'
import packagingJson from '@/data/packaging.json'

const good = {
  products: [
    {
      id: 'x',
      brand: 'B',
      product: 'P',
      market: 'DE',
      comparesTo: 'dark-92',
      sources: { s: { publisher: 'Shop', url: 'https://example.com/p', accessedOn: '2026-11-01' } },
      values: [{ label: 'Price', value: '€1', source: 's' }],
    },
  ],
}
const today = new Date('2026-11-26T12:00:00Z')
const clone = () => structuredClone(good)

test('the shipped data is valid and loads', () => {
  expect(checkCompetitors(competitorsJson)).toEqual([])
  expect(checkHypotheses(hypothesesJson)).toEqual([])
  expect(competitors.length).toBeGreaterThanOrEqual(1)
  expect(competitors.length).toBeLessThanOrEqual(2)
  expect(hypotheses.length).toBeGreaterThanOrEqual(2)
})

test('every shipped competitor value has a source with URL and date', () => {
  for (const p of competitors) {
    for (const v of p.values) {
      const s = p.sources[v.source]
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.accessedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  }
})

test('a valid entry passes', () => {
  expect(checkCompetitors(good, today)).toEqual([])
})

test('an entry without a source URL is rejected', () => {
  const d = clone()
  ;(d.products[0].sources.s as { url?: string }).url = undefined
  expect(checkCompetitors(d, today).join()).toContain('https URL')
})

test('a non-https URL is rejected', () => {
  const d = clone()
  d.products[0].sources.s.url = 'http://example.com'
  expect(checkCompetitors(d, today).join()).toContain('https URL')
})

test('an entry without an access date is rejected', () => {
  const d = clone()
  d.products[0].sources.s.accessedOn = ''
  expect(checkCompetitors(d, today).join()).toContain('accessedOn')
})

test('a future access date is rejected', () => {
  const d = clone()
  d.products[0].sources.s.accessedOn = '2027-01-01'
  expect(checkCompetitors(d, today).join()).toContain('future')
})

test('a value pointing to an unknown source is rejected', () => {
  const d = clone()
  d.products[0].values[0].source = 'nope'
  expect(checkCompetitors(d, today).join()).toContain('unknown source')
})

test('a hypothesis without a data basis is rejected', () => {
  expect(checkHypotheses({ hypotheses: [{ id: 'h', statement: 'S', sku: 'dark-92', basis: [] }] }).join()).toContain('data basis')
})

test('no claim words in the shipped data, and the check catches them', () => {
  expect(findClaimWords(competitorsJson)).toEqual([])
  expect(findClaimWords(hypothesesJson)).toEqual([])
  expect(findClaimWords({ s: 'A Certified, climate-friendly bar' })).toEqual(['climate', 'certified'])
})

test('access dates format the same everywhere', () => {
  expect(formatAccessDate('2026-11-26')).toBe('26 Nov 2026')
})

test('estimated prices get a ~, other values do not', () => {
  const p = competitors[0]
  const price = p.values.find((v) => v.label === 'Price')!
  const cocoa = p.values.find((v) => v.label === 'Cocoa')!
  expect(displayValue(p, price)).toMatch(/^~€/)
  expect(displayValue(p, cocoa)).not.toContain('~')
  expect(snippetLine(p)).toMatch(/^~€[\d.]+ \/ \d+ g$/)
})

test('a non-estimate price shows without ~', () => {
  const p = structuredClone(good.products[0]) as CompetitorProduct
  expect(displayValue(p, p.values[0])).toBe('€1')
})

test('insights are filtered per SKU', () => {
  const dark = insightsFor('dark-92')
  expect(dark.products.every((p) => p.comparesTo === 'dark-92')).toBe(true)
  expect(dark.explore.length).toBeGreaterThan(0)
  expect(dark.hypotheses.every((h) => h.sku === 'dark-92')).toBe(true)
  expect(insightsFor().products.length).toBe(competitors.length)
})

test('an explore link without https is rejected', () => {
  const d = { ...clone(), explore: [{ label: 'X', url: 'http://x.test', comparesTo: 'dark-92' }] }
  expect(checkCompetitors(d, today).join()).toContain('explore[0]')
})

test('a hypothesis without a sku is rejected', () => {
  expect(checkHypotheses({ hypotheses: [{ id: 'h', statement: 'S', basis: ['b'] }] }).join()).toContain('missing sku')
})

test('packaging ideas are valid, claim-free, and filtered per SKU with "all"', () => {
  expect(checkPackaging(packagingJson)).toEqual([])
  expect(findClaimWords(packagingJson)).toEqual([])
  const dark = packagingFor('dark-92')
  expect(dark.every((i) => i.sku === 'all' || i.sku === 'dark-92')).toBe(true)
  expect(dark.some((i) => i.sku === 'all')).toBe(true)
})

test('a packaging idea with a bad source or no basis is rejected', () => {
  const bad = { ideas: [{ id: 'p', sku: 'all', statement: 'S', basis: [], sources: [{ publisher: 'X', note: 'n', url: 'http://x', accessedOn: '2030-01-01' }] }] }
  const errors = checkPackaging(bad, today).join()
  expect(errors).toContain('data basis')
  expect(errors).toContain('https URL')
  expect(errors).toContain('past accessedOn')
})
