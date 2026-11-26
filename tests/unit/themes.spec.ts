import { expect, test } from '@playwright/test'
import { TASTE_NOTES, THEMES, themeFor } from '../../lib/themes'

// Spec: docs/specs/slice-3-public-pages-and-feedback.md sections 4 and 8.1

test('U-TH-1: every taste note has a label and one of the five themes', () => {
  expect([...THEMES].sort()).toEqual(['bitterness', 'origin', 'packaging', 'sweetness', 'texture'])
  expect(TASTE_NOTES).toHaveLength(8)
  for (const n of TASTE_NOTES) {
    expect(n.label.length).toBeGreaterThan(0)
    expect(THEMES).toContain(n.theme)
    expect(themeFor(n.value)).toBe(n.theme)
  }
  expect(themeFor('nope')).toBeNull()
})

test('U-TH-2: taste note values are unique', () => {
  const values = TASTE_NOTES.map((n) => n.value)
  expect(new Set(values).size).toBe(values.length)
})
