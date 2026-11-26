import { expect, test } from '@playwright/test'
import { signInContext } from './support/auth'

// Slice 7 cards in the dashboard product view (ADR 0001 amendment 2, ADR 0007). Signed in through the real login.
const DARK_92 = '/dashboard?view=product&id=dark-92'

test.beforeEach(async ({ context, request, baseURL }) => {
  await signInContext(context, request, baseURL!)
})

test('every competitor value shows a source link and a date', async ({ page }) => {
  await page.goto(DARK_92)
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
  await page.goto(DARK_92)
  const card = page.getByTestId('competitor-panel')
  await expect(card.getByTestId('competitor-snippet').first()).toHaveText(/^~€[\d.]+ \/ \d+ g$/)
  await expect(card.getByTestId('competitor-value').first()).toBeHidden()
  await card.getByTestId('competitor-product').first().locator('summary').click()
  await expect(card.getByTestId('competitor-value').first()).toBeVisible()
  await expect(card).toContainText('Prices with ~ are estimates from public listings.')
  await expect(card).toContainText('Sources are linked so you can check any detail.')
  await expect(card.getByTestId('explore-links')).toContainText('Also worth a look')
})

test('every hypothesis is labelled and shows its data basis', async ({ page }) => {
  await page.goto(DARK_92)
  const items = page.getByTestId('hypothesis')
  const count = await items.count()
  expect(count).toBeGreaterThanOrEqual(2)
  for (let i = 0; i < count; i++) {
    await expect(items.nth(i).getByTestId('hypothesis-label')).toHaveText('Hypothesis, not validated')
    await expect(items.nth(i)).toContainText('Data basis:')
  }
})

test('the dashboard carries the demo banner', async ({ page }) => {
  await page.goto(DARK_92)
  await expect(page.getByText('Demo prototype, synthetic data').first()).toBeVisible()
})

test('every packaging idea is labelled, and its sources show a link and date', async ({ page }) => {
  await page.goto(DARK_92)
  const ideas = page.getByTestId('packaging-idea')
  const count = await ideas.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(ideas.nth(i).getByTestId('suggestion-label')).toHaveText('Suggestion, not validated')
  }
  const sources = page.getByTestId('packaging-source').locator('a')
  for (let i = 0; i < (await sources.count()); i++) {
    await expect(sources.nth(i)).toHaveAttribute('href', /^https:\/\//)
    await expect(sources.nth(i)).toHaveText(/\d{1,2} [A-Z][a-z]{2} \d{4}/)
  }
})
