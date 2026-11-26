import { expect, test } from '@playwright/test'
import { fallbackCode, seedPayload } from '../../lib/catalog'
import { seedPayload as scriptsPayload } from '../../scripts/seedData'

// Spec: docs/specs/slice-2-qr-redirect.md section 7.4

test('U-CAT-1: fallbackCode returns the seeded target for every code', () => {
  for (const c of seedPayload.codes) {
    expect(fallbackCode(c.id)).toEqual({
      status: c.status,
      target_type: c.target_type,
      sku_id: c.sku_id,
      collection_id: c.collection_id,
      campaign_id: c.campaign_id,
      market: c.market,
    })
  }
})

test('U-CAT-2: fallbackCode returns null for an unknown code', () => {
  expect(fallbackCode('nope')).toBeNull()
  expect(fallbackCode('')).toBeNull()
})

test('U-CAT-3: the scripts re-export the same catalogue', () => {
  expect(scriptsPayload).toBe(seedPayload)
})
