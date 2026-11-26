import { expect, test } from '@playwright/test'
import { checkCompetitors, checkHypotheses, competitors, findClaimWords, formatAccessDate, hypotheses } from '@/lib/insights'
import competitorsJson from '@/data/competitors.json'
import hypothesesJson from '@/data/hypotheses.json'

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
  expect(checkHypotheses({ hypotheses: [{ id: 'h', statement: 'S', basis: [] }] }).join()).toContain('data basis')
})

test('no claim words in the shipped data, and the check catches them', () => {
  expect(findClaimWords(competitorsJson)).toEqual([])
  expect(findClaimWords(hypothesesJson)).toEqual([])
  expect(findClaimWords({ s: 'A Certified, climate-friendly bar' })).toEqual(['climate', 'certified'])
})

test('access dates format the same everywhere', () => {
  expect(formatAccessDate('2026-11-26')).toBe('26 Nov 2026')
})
