import { expect, test } from '@playwright/test'
import { BRAND_HOSTS, brandLinksFor, BRAND_LINKS } from '../../lib/brandLinks'
import { seedPayload } from '../../lib/catalog'

// ADR 0003 amendment 1: real links to the brand's own site.

test('BL-1: Dark 92% links to its shop page and the story video', () => {
  expect(brandLinksFor('dark-92')).toEqual({
    shop: 'https://www.fairafricghana.com/products/92-dark-chocolate',
    story: 'https://www.youtube.com/watch?v=UtMBaHedmek',
  })
})

test('BL-2: other bars have no links yet (demo buttons stay)', () => {
  expect(brandLinksFor('creamy-oat')).toEqual({})
  expect(brandLinksFor('nope')).toEqual({})
})

test('BL-3: every link is https on a brand host and every key is a known SKU', () => {
  const skus = new Set(seedPayload.skus.map((s) => s.id))
  for (const [sku, links] of Object.entries(BRAND_LINKS)) {
    expect(skus.has(sku), sku).toBe(true)
    for (const url of Object.values(links)) {
      const u = new URL(url!)
      expect(u.protocol).toBe('https:')
      expect(BRAND_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`)), url).toBe(true)
    }
  }
})
