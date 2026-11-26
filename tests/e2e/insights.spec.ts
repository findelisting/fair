import { expect, test } from '@playwright/test'

// Slice 7 cards, rendered per SKU on the dev-only preview page (ADR 0001).
// Moves to the dashboard product view in slice 4. Skipped against a deployed (production) URL.
test.skip(!!process.env.E2E_BASE_URL, 'The preview page exists in dev only')

test('every competitor value shows a source link and a date', async ({ page }) => {
  await page.goto('/preview/insights')
  const values = page.getByTestId('competitor-value')
  const count = await values.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const link = values.nth(i).getByTestId('value-source')
    await expect(link).toHaveAttribute('href', /^https:\/\//)
    await expect(link).toHaveText(/\d{1,2} [A-Z][a-z]{2} \d{4}/)
  }
  await expect(page.getByText(/to be verified/i)).toHaveCount(0)
})

test('the card is a snippet: one line per product, ~ on estimates, expands on click', async ({ page }) => {
  await page.goto('/preview/insights')
  const card = page.getByTestId('preview-dark-92').getByTestId('competitor-panel')
  await expect(card.getByTestId('competitor-snippet').first()).toHaveText(/^~€[\d.]+ \/ \d+ g$/)
  await expect(card.getByTestId('competitor-value').first()).toBeHidden()
  await card.getByTestId('competitor-product').first().locator('summary').click()
  await expect(card.getByTestId('competitor-value').first()).toBeVisible()
  await expect(card).toContainText('Prices with ~ are estimates from public listings.')
  await expect(card).toContainText('Sources are linked so you can check any detail.')
  await expect(card.getByTestId('explore-links')).toContainText('Also worth a look')
})

test('every hypothesis is labelled and shows its data basis', async ({ page }) => {
  await page.goto('/preview/insights')
  const items = page.getByTestId('hypothesis')
  const count = await items.count()
  expect(count).toBeGreaterThanOrEqual(2)
  for (let i = 0; i < count; i++) {
    await expect(items.nth(i).getByTestId('hypothesis-label')).toHaveText('Hypothesis, not validated')
    await expect(items.nth(i)).toContainText('Data basis:')
  }
})

test('the preview page carries the demo banner', async ({ page }) => {
  await page.goto('/preview/insights')
  await expect(page.getByText('Demo prototype, synthetic data').first()).toBeVisible()
})
