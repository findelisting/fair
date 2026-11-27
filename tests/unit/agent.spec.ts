import { expect, test } from '@playwright/test'
import {
  COLLECTION_QUESTIONS,
  QUESTIONS,
  buildAnswer,
  buildPriceAnswer,
  formatBerlin,
  formatCount,
  agentStatusLine,
  isQuestionId,
  type AgentRow,
} from '../../lib/agent'
import { findClaimWords, type CompetitorProduct } from '../../lib/insights'

// Spec: docs/specs/slice-6-product-agent.md section 7.1. No database.

const AS_OF = new Date('2026-11-26T13:05:00Z') // 14:05 in Berlin (CET)

function row(key: string, label: string, live: number, synthetic: number): AgentRow {
  return { key, label, total: live + synthetic, live, synthetic, first_ts: '2026-09-28T08:00:00Z', last_ts: '2026-11-26T12:00:00Z' }
}

const SCANS = [row('d92-at', 'Dark 92% wrapper', 2, 410), row('fb-d92', 'Dark 92% shelf talker', 0, 198)]
const VISITS = [row('shelf-q4-2026', 'Shelf talker, Q4', 0, 300), row('wrapper-2026', 'On-pack wrapper code', 0, 120), row('none', 'No campaign', 0, 30)]
const THEMES = [row('bitterness', 'Bitterness', 1, 44), row('origin', 'Origin', 0, 20)]

const LINDT: CompetitorProduct = {
  id: 'lindt-excellence-90',
  brand: 'Lindt',
  product: 'Excellence Mild 90%',
  market: 'DE',
  comparesTo: 'dark-92',
  sources: { knuspr: { publisher: 'Knuspr', url: 'https://www.knuspr.de/52660-lindt-excellence-mild-90', accessedOn: '2026-11-26', estimate: true } },
  values: [
    { label: 'Price', value: '€5.09', source: 'knuspr' },
    { label: 'Pack size', value: '100 g', source: 'knuspr' },
    { label: 'Price per kg', value: '€50.90', source: 'knuspr' },
    { label: 'Cocoa', value: '90%', source: 'knuspr' },
  ],
} as CompetitorProduct

const CAUSAL = /\b(caused|because of|drove|driven by|led to)\b/i

test('U-AG-1: four fixed questions', () => {
  expect(QUESTIONS.map((q) => q.id)).toEqual(['top-packaging-at', 'feedback-visits-by-campaign', 'top-theme-dark-92', 'comparable-dark-bars'])
  expect(QUESTIONS.map((q) => q.question)).toEqual([
    'Which packaging had the most scans in Austria?',
    'Which campaign drove visits to the feedback page?',
    'Which theme comes up most for the 92% bar?',
    'What do comparable dark bars cost?',
  ])
  expect(isQuestionId('top-packaging-at')).toBe(true)
  expect(isQuestionId('nope')).toBe(false)
  expect(isQuestionId(undefined)).toBe(false)
})

test('U-AG-2: clear winners give count-based sentences with the runner-up', () => {
  expect(buildAnswer('top-packaging-at', SCANS, AS_OF).answer).toBe(
    'The Dark 92% wrapper code had the most scans in Austria: 412, against 198 for the Dark 92% shelf talker code.',
  )
  expect(buildAnswer('feedback-visits-by-campaign', VISITS, AS_OF).answer).toBe(
    'Most feedback-page visits came from the Shelf talker, Q4 campaign: 300 of 450 visits.',
  )
  expect(buildAnswer('top-theme-dark-92', THEMES, AS_OF).answer).toBe(
    'Bitterness comes up most in feedback on the Dark 92% bar: 45 of 65 answers.',
  )
})

test('U-AG-3: a single row has no runner-up part', () => {
  const a = buildAnswer('top-packaging-at', [SCANS[0]], AS_OF).answer
  expect(a).toBe('The Dark 92% wrapper code had the most scans in Austria: 412.')
})

test('U-AG-4: a tie at the top names both', () => {
  const tied = [row('a', 'Alpha', 0, 50), row('b', 'Beta', 0, 50), row('c', 'Gamma', 0, 10)]
  for (const id of ['top-packaging-at', 'feedback-visits-by-campaign', 'top-theme-dark-92'] as const) {
    expect(buildAnswer(id, tied, AS_OF).answer).toContain('Alpha and Beta are tied with 50 each')
  }
})

test('U-AG-5: no rows says so and shows 0 answers in the sources', () => {
  const a = buildAnswer('top-theme-dark-92', [], AS_OF)
  expect(a.answer).toBe('Not enough data yet for this question.')
  expect(a.sources).toHaveLength(1)
  expect(a.sources[0].detail).toContain('0 answers')
  expect(a.counts).toEqual({ live: 0, synthetic: 0 })
})

test('U-AG-6: the badge follows the kind of rows used', () => {
  expect(buildAnswer('top-packaging-at', [row('a', 'A', 3, 0)], AS_OF).sources[0].kind).toBe('live')
  expect(buildAnswer('top-packaging-at', [row('a', 'A', 0, 3)], AS_OF).sources[0].kind).toBe('synthetic')
  expect(buildAnswer('top-packaging-at', SCANS, AS_OF).sources[0].kind).toBe('mixed')
})

test('U-AG-7: the source names the table, filter, row split and date range', () => {
  const s = buildAnswer('top-packaging-at', SCANS, AS_OF).sources[0]
  expect(s.name).toBe('QR scans')
  expect(s.detail).toBe('Austria, bot scans left out · 610 scans (2 live, 608 synthetic) · 28 Sep to 26 Nov 2026')
  expect(buildAnswer('feedback-visits-by-campaign', VISITS, AS_OF).sources[0].name).toBe('Feedback page visits')
  expect(buildAnswer('top-theme-dark-92', THEMES, AS_OF).sources[0].name).toBe('Feedback answers')
  expect(buildAnswer('top-packaging-at', SCANS, AS_OF).counts).toEqual({ live: 2, synthetic: 608 })
})

test('U-AG-8: as-of time is shown in Berlin time', () => {
  expect(formatBerlin(AS_OF)).toBe('26 Nov 2026, 14:05')
  const a = buildAnswer('top-packaging-at', SCANS, AS_OF)
  expect(a.sources[0].date).toBe('26 Nov 2026, 14:05')
  expect(a.asOf).toBe(AS_OF.toISOString())
})

test('U-AG-9: no causal words and no claim words in any answer', () => {
  const answers = [
    buildAnswer('top-packaging-at', SCANS, AS_OF),
    buildAnswer('feedback-visits-by-campaign', VISITS, AS_OF),
    buildAnswer('top-theme-dark-92', THEMES, AS_OF),
    buildPriceAnswer([LINDT], AS_OF),
  ]
  for (const a of answers) {
    expect(a.answer, a.id).not.toMatch(CAUSAL)
    expect(findClaimWords({ text: a.answer }), a.id).toEqual([])
  }
})

test('U-AG-10: the price answer marks estimates and lists each listing', () => {
  const a = buildPriceAnswer([LINDT], AS_OF)
  expect(a.id).toBe('comparable-dark-bars')
  expect(a.answer).toBe(
    'Comparable dark bars: Lindt Excellence Mild 90%, ~€5.09 for 100 g (~€50.90 per kg). Prices with ~ are estimates from public listings.',
  )
  expect(a.sources).toEqual([
    { name: 'Knuspr', detail: 'Lindt Excellence Mild 90%', url: 'https://www.knuspr.de/52660-lindt-excellence-mild-90', date: '26 Nov 2026' },
  ])
})

test('U-AG-11: no comparable products says so', () => {
  expect(buildPriceAnswer([], AS_OF).answer).toBe('Not enough data yet for this question.')
})

test('U-AG-12: numbers use English grouping', () => {
  expect(formatCount(1234)).toBe('1,234')
  expect(formatCount(12)).toBe('12')
  const big = buildAnswer('top-packaging-at', [row('a', 'Alpha', 0, 1234), row('b', 'Beta', 0, 10)], AS_OF).answer
  expect(big).toContain('1,234')
})

test('UX-4: every question states its scope, and only spanning questions show in the collection view', () => {
  for (const q of QUESTIONS) expect(q.scope.trim(), q.id).not.toBe('')
  expect(COLLECTION_QUESTIONS).toEqual(['top-packaging-at', 'feedback-visits-by-campaign'])
})

test("RD-5: the status line before a streamed answer uses only the answer's own counts", () => {
  expect(agentStatusLine({ id: 'top-packaging-at', sources: [], counts: { live: 2, synthetic: 1194 } })).toBe('Looking at 1,196 scans…')
  expect(agentStatusLine({ id: 'top-theme-dark-92', sources: [], counts: { live: 0, synthetic: 134 } })).toBe('Looking at 134 answers…')
  expect(agentStatusLine({ id: 'feedback-visits-by-campaign', sources: [] })).toBe('Looking at the visits…')
  const listing = { name: 'Shop', date: '1 Nov 2026', url: 'https://example.com' }
  expect(agentStatusLine({ id: 'comparable-dark-bars', sources: [listing, listing] })).toBe('Looking at 2 public listings…')
})
