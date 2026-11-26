import { expect, test } from '@playwright/test'
import { shouldCountView } from '../../lib/pageViews'

// Spec: docs/specs/slice-3-public-pages-and-feedback.md section 5

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

test('U-PV-1: a phone browser is counted', () => {
  expect(shouldCountView(new Headers({ 'user-agent': IPHONE }))).toBe(true)
})

test('U-PV-2: bots and an empty user agent are not counted', () => {
  expect(shouldCountView(new Headers({ 'user-agent': 'WhatsApp/2.24.21.79 A' }))).toBe(false)
  expect(shouldCountView(new Headers({}))).toBe(false)
})

test('U-PV-3: prefetch requests are not counted', () => {
  const cases: Record<string, string>[] = [
    { 'next-router-prefetch': '1' },
    { 'sec-purpose': 'prefetch' },
    { purpose: 'prefetch' },
    { 'sec-purpose': 'prefetch;prerender' },
  ]
  for (const h of cases) {
    expect(shouldCountView(new Headers({ 'user-agent': IPHONE, ...h })), JSON.stringify(h)).toBe(false)
  }
})
