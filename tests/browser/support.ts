import { expect, type Page } from '@playwright/test'
import { testDb } from '../e2e/support/db'

export { testDb }

/** Every test answer starts with this, so the teardown can delete it (ADR 0003, decision 11). */
export const E2E_MARK = '[e2e]'

export const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

export const FORM_URL = '/f/dark-92?sku=dark-92&campaign=shelf-q4-2026&market=AT'

/** Fills the feedback form. Returns the one-time token the page rendered. */
export async function fillFeedback(
  page: Page,
  opts: { rating?: number | null; tasteLabel?: string; freeText?: string } = {},
): Promise<string> {
  const { rating = 4, tasteLabel = 'Nicely intense', freeText = `${E2E_MARK} test answer` } = opts
  if (rating) await page.getByLabel(rating === 1 ? '1 star' : `${rating} stars`, { exact: true }).check({ force: true })
  await page.getByLabel(tasteLabel, { exact: true }).check({ force: true })
  await page.getByLabel(/anything else/i).fill(freeText)
  const token = await page.locator('input[name="submission_id"]').inputValue()
  expect(token).toMatch(/^[0-9a-f-]{36}$/)
  return token
}

export async function feedbackRows(submissionId: string) {
  const { data, error } = await testDb().from('feedback').select('*').eq('submission_id', submissionId)
  if (error) throw new Error(error.message)
  return data ?? []
}
