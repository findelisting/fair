import { expect, test } from '@playwright/test'
import { seedPayload } from '../../lib/catalog'
import { BANNED_CLAIM_WORDS } from '../../lib/insights'
import { storyFor } from '../../lib/productStory'

// ADR 0011: short demo story per bar.

test('UX-5: every active bar has a story and tasting notes', () => {
  for (const sku of seedPayload.skus.filter((s) => s.status === 'active')) {
    const s = storyFor(sku.id)
    expect(s, sku.id).not.toBeNull()
    expect(s!.story.length, sku.id).toBeLessThanOrEqual(160)
    expect(s!.tasting.length, sku.id).toBeGreaterThanOrEqual(2)
  }
})

test('UX-6: story text holds no claim words', () => {
  const re = new RegExp(`\\b(${BANNED_CLAIM_WORDS.join('|')}|organic|fair ?trade|sustainab\\w*)\\b`, 'i')
  for (const sku of seedPayload.skus) {
    const s = storyFor(sku.id)
    if (s) expect(`${s.story} ${s.tasting.join(' ')}`, sku.id).not.toMatch(re)
  }
})
