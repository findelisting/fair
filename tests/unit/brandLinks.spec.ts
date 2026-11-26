import { expect, test } from '@playwright/test'
import { brandLinksFor, BRAND_LINKS } from '../../lib/brandLinks'
import { seedPayload } from '../../lib/catalog'

// ADR 0003 amendment 1: real links to the brand's own site.

test('BL-1: Dark 92% shop button links to the fairafric product page', () => {
  expect(brandLinksFor('dark-92').shop).toBe('https://www.fairafric.com/en/products/92-organic-dark-chocolate')
})

test('BL-2: other bars have no links yet (demo buttons stay)', () => {
  expect(brandLinksFor('creamy-oat')).toEqual({})
  expect(brandLinksFor('nope')).toEqual({})
})

test('BL-3: every link is https on fairafric.com and every key is a known SKU', () => {
  const skus = new Set(seedPayload.skus.map((s) => s.id))
  for (const [sku, links] of Object.entries(BRAND_LINKS)) {
    expect(skus.has(sku), sku).toBe(true)
    for (const url of Object.values(links)) {
      const u = new URL(url!)
      expect(u.protocol).toBe('https:')
      expect(u.hostname === 'fairafric.com' || u.hostname.endsWith('.fairafric.com'), url).toBe(true)
    }
  }
})
