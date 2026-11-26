// Fixed taste-note choices on the feedback form, each mapped to one theme.
// The same five themes are used by the synthetic feedback in slice 5.
// Spec: docs/specs/slice-3-public-pages-and-feedback.md section 4.

export const THEMES = ['bitterness', 'sweetness', 'texture', 'packaging', 'origin'] as const
export type Theme = (typeof THEMES)[number]

export interface TasteNote {
  value: string
  label: string
  theme: Theme
}

export const TASTE_NOTES: readonly TasteNote[] = [
  { value: 'too-bitter', label: 'Too bitter for me', theme: 'bitterness' },
  { value: 'nicely-intense', label: 'Nicely intense', theme: 'bitterness' },
  { value: 'too-sweet', label: 'Too sweet', theme: 'sweetness' },
  { value: 'not-sweet-enough', label: 'Not sweet enough', theme: 'sweetness' },
  { value: 'smooth-creamy', label: 'Smooth and creamy', theme: 'texture' },
  { value: 'grainy-waxy', label: 'Grainy or waxy', theme: 'texture' },
  { value: 'love-wrapper', label: 'Love the wrapper', theme: 'packaging' },
  { value: 'origin-story', label: 'The origin story caught my eye', theme: 'origin' },
]

const BY_VALUE = new Map(TASTE_NOTES.map((n) => [n.value, n]))

export function themeFor(value: string): Theme | null {
  return BY_VALUE.get(value)?.theme ?? null
}
