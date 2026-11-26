// Feedback validation and contact redaction. Pure logic, no server-only imports, so unit tests can use it.
// Spec: docs/specs/slice-3-public-pages-and-feedback.md sections 6 and 7; ADR 0003 decisions 6 to 8.
import { skuById } from './catalog'
import { cleanParams } from './params'
import { themeFor } from './themes'

export const FREE_TEXT_MAX = 500
export const REMOVED = '[removed]'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Contact details people may type into free text. Ordinary numbers ("92%", "80 g", "2026") stay.
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g
const LINK = /\bhttps?:\/\/\S+|\bwww\.\S+/gi
// 7 or more digits, optionally starting with "+" or "(", with up to two spaces, dots, dashes or brackets
// between digits (so "(030) 1234567" matches).
const PHONE = /(?:\+|\()?\d(?:[\s.\-()]{0,2}\d){6,}\)?/g

export function redactContacts(text: string): string {
  return text.replace(EMAIL, REMOVED).replace(LINK, REMOVED).replace(PHONE, REMOVED)
}

// Control characters except tab, line feed and carriage return.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function cleanFreeText(raw: string): string | null {
  const cleaned = redactContacts(raw.replace(CONTROL, '').trim()).slice(0, FREE_TEXT_MAX).trim()
  return cleaned.length ? cleaned : null
}

export interface FeedbackValues {
  rating: string
  taste_note: string
  free_text: string
}

export interface FeedbackRow {
  sku_id: string
  campaign_id: string | null
  market: string | null
  rating: number
  taste_note: string
  free_text: string | null
  themes: string[]
  source: 'live'
  submission_id: string
}

export type FieldErrors = Partial<Record<'sku' | 'rating' | 'taste_note' | 'submission_id', string>>

export type Validation = { ok: true; row: FeedbackRow } | { ok: false; fields: FieldErrors; values: FeedbackValues }

/** What the form shows after a submit that did not save. */
export type FormState =
  | { status: 'idle' }
  | { status: 'error'; error: 'invalid' | 'unavailable' | 'rate-limited'; fields: FieldErrors; values: FeedbackValues }

type Input = FormData | Record<string, string | undefined>

function field(input: Input, key: string): string {
  const v = input instanceof FormData ? input.get(key) : input[key]
  return typeof v === 'string' ? v : ''
}

export function valuesOf(input: Input): FeedbackValues {
  return {
    rating: field(input, 'rating'),
    taste_note: field(input, 'taste_note'),
    free_text: field(input, 'free_text').slice(0, 2_000),
  }
}

export function validateFeedback(input: Input): Validation {
  const values = valuesOf(input)
  const fields: FieldErrors = {}

  const skuId = field(input, 'sku')
  const sku = skuById(skuId)
  if (!sku || sku.status !== 'active') fields.sku = 'Unknown product'

  const rating = /^[1-5]$/.test(values.rating) ? Number(values.rating) : null
  if (rating === null) fields.rating = 'Choose 1 to 5 stars'

  const theme = themeFor(values.taste_note)
  if (!theme) fields.taste_note = 'Choose one option'

  const submissionId = field(input, 'submission_id')
  if (!UUID.test(submissionId)) fields.submission_id = 'Please reload the page and try again'

  if (Object.keys(fields).length || !sku || rating === null || !theme) return { ok: false, fields, values }

  const { campaign, market } = cleanParams({ campaign: field(input, 'campaign'), market: field(input, 'market') })
  return {
    ok: true,
    row: {
      sku_id: sku.id,
      campaign_id: campaign,
      market,
      rating,
      taste_note: values.taste_note,
      free_text: cleanFreeText(values.free_text),
      themes: [theme],
      source: 'live',
      submission_id: submissionId.toLowerCase(),
    },
  }
}
