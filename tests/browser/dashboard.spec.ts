import { expect, test } from '@playwright/test'
import { demoPassword, signInContext } from '../e2e/support/auth'
import { E2E_LANGUAGE } from '../e2e/support/db'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

// Slice 4 (ADR 0007, spec docs/specs/slice-4-dashboard.md).

test('login form signs in and returns to the requested page', async ({ page }) => {
  await page.goto('/dashboard?view=collection&id=vegan-creamy')
  await expect(page).toHaveURL(/\/login\?next=/)
  await expect(page.getByText('Demo prototype, synthetic data').first()).toBeVisible()
  await page.getByLabel('Demo password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('That password did not work.')
  await page.getByLabel('Demo password').fill(demoPassword())
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard\?view=collection&id=vegan-creamy/)
  await expect(page.getByTestId('panel-scans')).toBeVisible()
})

test.describe('signed in', () => {
  test.beforeEach(async ({ context, request, baseURL }) => {
    await signInContext(context, request, baseURL!)
  })

  test('P-3: panels show numbers with their badges', async ({ page }) => {
    await page.goto('/dashboard')
    for (const id of ['panel-scans', 'panel-page-views', 'panel-feedback', 'panel-web']) {
      const panel = page.getByTestId(id)
      await expect(panel).toBeVisible()
      await expect(panel.getByTestId('data-badge')).toHaveCount(1)
    }
    await expect(page.getByTestId('panel-web').getByTestId('data-badge')).toHaveAttribute('data-kind', 'synthetic')
    await expect(page.getByTestId('scan-total')).toHaveText(/\d/)
    await expect(page.getByTestId('panel-feedback')).toContainText('bitterness')
  })

  test('a test scan shows on the open dashboard within 10 seconds', async ({ page, request }) => {
    await page.goto('/dashboard?view=product&id=dark-92&market=AT')
    const live = page.getByTestId('scan-live')
    const before = Number((await live.textContent())!.replace(/[^0-9]/g, ''))
    const started = Date.now()
    const scan = await request.get('/r/d92-at', { headers: { 'user-agent': IPHONE, 'accept-language': E2E_LANGUAGE }, maxRedirects: 0 })
    expect(scan.status()).toBe(302)
    await expect(live).toHaveText(String(before + 1), { timeout: 10_000 })
    expect(Date.now() - started).toBeLessThan(10_000)
  })

  test('P-2: filters stay in the URL', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByLabel('Market').selectOption('AT')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page).toHaveURL(/market=AT/)
    await expect(page.getByLabel('Market')).toHaveValue('AT')
  })

  test('P-4: a failed poll keeps the last numbers and shows Reconnecting', async ({ page }) => {
    await page.goto('/dashboard')
    const total = await page.getByTestId('scan-total').textContent()
    await page.route('**/api/dashboard**', (route) => route.abort())
    await expect(page.getByTestId('poll-status')).toContainText('Reconnecting', { timeout: 15_000 })
    await expect(page.getByTestId('scan-total')).toHaveText(total!)
    await page.unroute('**/api/dashboard**')
    await expect(page.getByTestId('poll-status')).not.toContainText('Reconnecting', { timeout: 15_000 })
  })

  test('P-6: insight cards sit in the product view with a once-per-card check', async ({ page }) => {
    await page.goto('/dashboard?view=product&id=dark-92')
    await expect(page.getByTestId('competitor-panel')).toBeVisible()
    await expect(page.getByTestId('hypotheses-panel')).toBeVisible()
    const check = page.getByTestId('insight-check').first()
    await expect(check).toContainText('Useful and accurate?')
    await page.route('**/api/insight-check', (route) => route.fulfill({ status: 204 }))
    await check.getByRole('button', { name: 'Yes' }).click()
    await expect(check).toContainText('Thanks')
    await page.reload()
    await expect(page.getByTestId('insight-check').first()).toContainText('Thanks')
  })
})
