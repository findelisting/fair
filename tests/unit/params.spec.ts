import { expect, test } from '@playwright/test'
import { cleanParams } from '../../lib/params'

// Spec: docs/specs/slice-3-public-pages-and-feedback.md ADR 0003 decision 5, section 8.1

test('U-PR-1: known campaign and market are kept', () => {
  expect(cleanParams({ campaign: 'wrapper-2026', market: 'AT' })).toEqual({ campaign: 'wrapper-2026', market: 'AT' })
  expect(cleanParams(new URLSearchParams('campaign=shelf-q4-2026&market=CH'))).toEqual({ campaign: 'shelf-q4-2026', market: 'CH' })
})

test('U-PR-2: unknown, empty, repeated, long or hostile values become empty', () => {
  const bad = [
    {},
    { campaign: '', market: '' },
    { campaign: 'evil', market: 'XX' },
    { campaign: ['wrapper-2026', 'shelf-q4-2026'], market: ['AT', 'DE'] },
    { campaign: 'x'.repeat(500), market: 'at' },
    { campaign: '<script>alert(1)</script>', market: '"><img>' },
  ]
  for (const sp of bad) expect(cleanParams(sp), JSON.stringify(sp)).toEqual({ campaign: null, market: null })
})
