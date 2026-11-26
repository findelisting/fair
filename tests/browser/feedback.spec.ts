import { expect, test } from '@playwright/test'
import { E2E_MARK, FORM_URL, IPHONE, feedbackRows, fillFeedback } from './support'

// Spec: docs/specs/slice-3-public-pages-and-feedback.md section 8.2 (B-FB-*). Real demo database.
// B-FB-7 runs against a second server whose database is unreachable (see playwright.config.ts).

test.use({ userAgent: IPHONE, viewport: { width: 390, height: 844 } })

const EXPECTED_ROW = {
  sku_id: 'dark-92',
  campaign_id: 'shelf-q4-2026',
  market: 'AT',
  rating: 4,
  taste_note: 'nicely-intense',
  themes: ['bitterness'],
  source: 'live',
}

test.describe('JavaScript off', () => {
  test.use({ javaScriptEnabled: false })

  test('B-FB-2: the form works without JavaScript', async ({ page }) => {
    await page.goto(FORM_URL)
    const token = await fillFeedback(page)
    await page.getByRole('button', { name: 'Send feedback' }).click()
    await expect(page).toHaveURL(/\/f\/dark-92\/thanks/)
    await expect(page.getByText(/thank you/i)).toBeVisible()
    const rows = await feedbackRows(token)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ ...EXPECTED_ROW, free_text: `${E2E_MARK} test answer` })
  })

  test('B-FB-3 (no JS): a missing rating shows an error and keeps the typed text', async ({ page }) => {
    await page.goto(FORM_URL)
    // The browser's own "required" check would stop the submit; remove it to reach the server check.
    await page.locator('form').evaluate((f) => f.setAttribute('novalidate', ''))
    const token = await fillFeedback(page, { rating: null, freeText: `${E2E_MARK} keep me` })
    await page.getByRole('button', { name: 'Send feedback' }).click()
    await expect(page.getByText('Choose 1 to 5 stars')).toBeVisible()
    await expect(page.getByLabel(/anything else/i)).toHaveValue(`${E2E_MARK} keep me`)
    expect(await feedbackRows(token)).toHaveLength(0)
  })
})

test('B-FB-1: the form works with JavaScript', async ({ page }) => {
  await page.goto(FORM_URL)
  const token = await fillFeedback(page)
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page).toHaveURL(/\/f\/dark-92\/thanks\?sku=dark-92&campaign=shelf-q4-2026&market=AT/)
  const rows = await feedbackRows(token)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject(EXPECTED_ROW)
})

test('B-FB-3 (JS): a missing rating shows an inline error and keeps the typed text', async ({ page }) => {
  await page.goto(FORM_URL)
  await page.locator('form').evaluate((f) => f.setAttribute('novalidate', ''))
  const token = await fillFeedback(page, { rating: null, freeText: `${E2E_MARK} keep me too` })
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page.getByText('Choose 1 to 5 stars')).toBeVisible()
  await expect(page.getByLabel(/anything else/i)).toHaveValue(`${E2E_MARK} keep me too`)
  expect(await feedbackRows(token)).toHaveLength(0)
})

test('B-FB-4: email addresses and phone numbers are removed before saving', async ({ page }) => {
  await page.goto(FORM_URL)
  const token = await fillFeedback(page, { freeText: `${E2E_MARK} mail anna.k@example.de or call +49 170 1234567` })
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page).toHaveURL(/thanks/)
  const [row] = await feedbackRows(token)
  expect(row.free_text).toBe(`${E2E_MARK} mail [removed] or call [removed]`)
})

test('B-FB-5: the same form sent twice is stored once', async ({ page }) => {
  await page.goto(FORM_URL)
  const token = await fillFeedback(page)
  // Send the identical form twice without navigating, as a double tap would.
  await page.locator('form').evaluate((f: HTMLFormElement) => {
    f.requestSubmit()
    f.requestSubmit()
  })
  await expect(page).toHaveURL(/thanks/)
  // A second, later submit with the same token (for example after going back) is also ignored.
  await page.goto(FORM_URL)
  await fillFeedback(page)
  await page.locator('input[name="submission_id"]').evaluate((el: HTMLInputElement, t) => { el.value = t }, token)
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page).toHaveURL(/thanks/)
  expect(await feedbackRows(token)).toHaveLength(1)
})

test('B-FB-6: a filled honeypot shows thanks and stores nothing', async ({ page }) => {
  await page.goto(FORM_URL)
  const token = await fillFeedback(page)
  await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => { el.value = 'http://spam.example' })
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page).toHaveURL(/thanks/)
  expect(await feedbackRows(token)).toHaveLength(0)
})

test('B-FB-7: with the database down the form says so and keeps the typed text', async ({ page }) => {
  await page.goto(`http://localhost:3101${FORM_URL}`)
  await fillFeedback(page, { freeText: `${E2E_MARK} offline answer` })
  await page.getByRole('button', { name: 'Send feedback' }).click()
  await expect(page.getByText('Could not save your answer. Please try again.')).toBeVisible()
  await expect(page.getByLabel(/anything else/i)).toHaveValue(`${E2E_MARK} offline answer`)
})

test('B-FB-8: the form asks for no name, email or phone', async ({ page }) => {
  await page.goto(FORM_URL)
  const names = await page.locator('form [name]').evaluateAll((els) => els.map((e) => e.getAttribute('name')))
  const visible = names.filter((n) => n && !n.startsWith('$ACTION'))
  expect(new Set(visible)).toEqual(new Set(['rating', 'taste_note', 'free_text', 'sku', 'campaign', 'market', 'submission_id', 'website']))
  for (const type of ['email', 'tel']) expect(await page.locator(`form input[type="${type}"]`).count()).toBe(0)
  await expect(page.getByText(/anonymous/i)).toBeVisible()
})

test('B-FB-9: stars and choices work by keyboard and have labels', async ({ page }) => {
  await page.goto(FORM_URL)
  for (const label of ['1 star', '2 stars', '3 stars', '4 stars', '5 stars']) {
    await expect(page.getByRole('radio', { name: label, exact: true })).toHaveCount(1)
  }
  await page.getByRole('radio', { name: '1 star', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: '2 stars', exact: true })).toBeChecked()
  await expect(page.getByRole('radio', { name: 'Nicely intense', exact: true })).toHaveCount(1)
})
