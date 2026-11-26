import { expect, test } from '@playwright/test'
import { FREE_TEXT_MAX, redactContacts, validateFeedback } from '../../lib/feedback'

// Spec: docs/specs/slice-3-public-pages-and-feedback.md sections 6, 7 and 8.1

const TOKEN = '3f2a6c1e-8b4d-4e9a-9c1f-2b7d5e8a1c34'

function form(overrides: Record<string, string> = {}) {
  return {
    sku: 'dark-92',
    campaign: 'wrapper-2026',
    market: 'AT',
    rating: '4',
    taste_note: 'nicely-intense',
    free_text: '',
    submission_id: TOKEN,
    ...overrides,
  }
}

test('U-FB-1: a complete, valid form becomes a live row with its theme', () => {
  const r = validateFeedback(form({ free_text: 'Lovely bar' }))
  expect(r).toEqual({
    ok: true,
    row: {
      sku_id: 'dark-92',
      campaign_id: 'wrapper-2026',
      market: 'AT',
      rating: 4,
      taste_note: 'nicely-intense',
      free_text: 'Lovely bar',
      themes: ['bitterness'],
      source: 'live',
      submission_id: TOKEN,
    },
  })
})

test('U-FB-1b: empty free text is stored as null', () => {
  const r = validateFeedback(form({ free_text: '   ' }))
  expect(r.ok && r.row.free_text).toBeNull()
})

test('U-FB-2: bad ratings are refused', () => {
  for (const rating of ['0', '6', '2.5', 'abc', '']) {
    const r = validateFeedback(form({ rating }))
    expect(r.ok, rating).toBe(false)
    if (!r.ok) expect(r.fields.rating).toBe('Choose 1 to 5 stars')
  }
  const missing = form()
  delete (missing as Record<string, string>).rating
  expect(validateFeedback(missing).ok).toBe(false)
})

test('U-FB-3: an unknown or missing taste note is refused', () => {
  for (const taste_note of ['nope', '']) {
    const r = validateFeedback(form({ taste_note }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fields.taste_note).toBe('Choose one option')
  }
})

test('U-FB-4: an unknown SKU is refused', () => {
  const r = validateFeedback(form({ sku: 'nope' }))
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.fields.sku).toBeTruthy()
})

test('U-FB-5: free text is cut to 500 characters after redaction', () => {
  const r = validateFeedback(form({ free_text: 'a'.repeat(600) }))
  expect(r.ok && r.row.free_text?.length).toBe(FREE_TEXT_MAX)
})

test('U-FB-6: free text is trimmed and control characters removed', () => {
  const r = validateFeedback(form({ free_text: '  nice\u0000 bar\u0007  ' }))
  expect(r.ok && r.row.free_text).toBe('nice bar')
})

test('U-FB-6b: line breaks in free text are kept', () => {
  const r = validateFeedback(form({ free_text: 'line one\nline two' }))
  expect(r.ok && r.row.free_text).toBe('line one\nline two')
})

test('U-FB-7: a token that is not a UUID is refused', () => {
  for (const submission_id of ['', 'abc', '1234']) {
    const r = validateFeedback(form({ submission_id }))
    expect(r.ok).toBe(false)
  }
})

test('U-FB-8: unknown campaign and market are stored as empty, the form stays valid', () => {
  const r = validateFeedback(form({ campaign: 'evil', market: 'XX' }))
  expect(r.ok).toBe(true)
  if (r.ok) {
    expect(r.row.campaign_id).toBeNull()
    expect(r.row.market).toBeNull()
  }
})

test('U-FB-9: errors return the typed values and nothing else', () => {
  const r = validateFeedback(form({ rating: '', free_text: 'my typed text' }))
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.values).toEqual({ rating: '', taste_note: 'nicely-intense', free_text: 'my typed text' })
})

test('U-RX-1: email addresses are removed', () => {
  expect(redactContacts('mail me: anna.k@example.de please')).toBe('mail me: [removed] please')
})

test('U-RX-2: phone numbers are removed', () => {
  for (const phone of ['+49 170 1234567', '0170-123 45 67', '(030) 1234567', '+233.24.123.4567']) {
    const out = redactContacts(`call ${phone} now`)
    expect(out, phone).toBe('call [removed] now')
  }
})

test('U-RX-3: links are removed', () => {
  expect(redactContacts('see https://x.example/a and www.example.com ok')).toBe('see [removed] and [removed] ok')
})

test('U-RX-4: ordinary numbers stay', () => {
  const text = '92% is great, 80 g bar, 3 stars, bought 2 in 2026'
  expect(redactContacts(text)).toBe(text)
})
