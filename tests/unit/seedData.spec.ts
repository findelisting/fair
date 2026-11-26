import { expect, test } from '@playwright/test'
import { seedPayload, validateSeed, type SeedPayload } from '../../scripts/seedData'

test('the demo seed is valid', () => {
  expect(validateSeed(seedPayload)).toEqual([])
})

test('the seed matches the scope: 3 SKUs, 1 collection, 8 markets, 4 channels', () => {
  expect(seedPayload.skus).toHaveLength(3)
  expect(seedPayload.collections).toHaveLength(1)
  expect(seedPayload.markets.map((m) => m.code).sort()).toEqual(['AT', 'CH', 'CZ', 'DE', 'FR', 'GH', 'SK', 'UK'])
  expect(new Set(seedPayload.campaigns.map((c) => c.channel))).toEqual(
    new Set(['wrapper', 'shelf_talker', 'influencer', 'trade_fair']),
  )
})

test('the collection points to several SKUs, and there is one collection code', () => {
  const members = seedPayload.collection_skus.filter((cs) => cs.collection_id === 'vegan-creamy')
  expect(members.length).toBeGreaterThanOrEqual(2)
  expect(seedPayload.codes.filter((c) => c.target_type === 'collection')).toHaveLength(1)
})

test('every SKU has a code, and there is a feedback code', () => {
  for (const sku of seedPayload.skus) {
    expect(seedPayload.codes.some((c) => c.sku_id === sku.id && c.target_type === 'product')).toBe(true)
  }
  expect(seedPayload.codes.some((c) => c.target_type === 'feedback')).toBe(true)
})

test('the validator catches broken references', () => {
  const broken: SeedPayload = structuredClone(seedPayload)
  broken.codes.push({
    id: 'Bad Slug', label: 'x', target_type: 'collection', sku_id: 'dark-92', collection_id: 'nope',
    campaign_id: 'nope', market: 'XX', status: 'active',
  })
  const problems = validateSeed(broken)
  expect(problems.join('\n')).toMatch(/bad slug/)
  expect(problems.join('\n')).toMatch(/unknown campaign/)
  expect(problems.join('\n')).toMatch(/unknown market/)
  expect(problems.join('\n')).toMatch(/needs a known collection/)
  expect(problems.join('\n')).toMatch(/must not have a sku/)
})
