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

  test('EV-4: panels, agent answers and ideas carry an evidence tag; legend lists four', async ({ page }) => {
    await page.goto('/dashboard?ask=feedback-visits-by-campaign')
    const expected = { 'panel-scans': 'observed', 'panel-page-views': 'observed', 'panel-feedback': 'observed', 'panel-web': 'attributed' }
    for (const [id, kind] of Object.entries(expected)) {
      const tag = page.getByTestId(id).getByTestId('evidence-tag')
      await expect(tag, id).toHaveCount(1)
      await expect(tag, id).toHaveAttribute('data-evidence', kind)
    }
    await expect(page.getByTestId('agent-answer').getByTestId('evidence-tag')).toHaveAttribute('data-evidence', 'attributed')
    await expect(page.getByTestId('hypotheses-panel').getByTestId('evidence-tag')).toHaveAttribute('data-evidence', 'correlation')
    await page.getByText('How sure?').click()
    await expect(page.getByTestId('evidence-legend-item')).toHaveCount(4)
  })

  test('DS-5: the data sources drawer labels every source, Request opens the pilot note, Escape closes it', async ({ page }) => {
    for (const path of ['/dashboard', '/dashboard?view=collection&id=vegan-creamy']) {
      await page.goto(path)
      const scrollBefore = await page.evaluate(() => window.scrollY)
      const opener = page.getByTestId('open-sources')
      await opener.click()
      const panel = page.getByTestId('data-sources-panel')
      await expect(panel).toBeVisible()
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)
      await expect(panel.getByTestId('source-connected')).toHaveCount(3)
      const available = panel.getByTestId('source-available')
      const n = await available.count()
      expect(n).toBeGreaterThanOrEqual(4)
      await expect(available.filter({ hasText: 'Demo: not connected' })).toHaveCount(n)
      const first = available.first()
      await expect(first.getByTestId('source-note')).toBeHidden()
      await first.getByText('Request').click()
      await expect(first.getByTestId('source-note')).toContainText('Not connected in this demo')
      await page.keyboard.press('Escape')
      await expect(panel).toBeHidden()
      await expect(opener).toBeFocused()
    }
    // The compact list at the bottom opens the same drawer.
    await page.getByRole('button', { name: 'See all data sources' }).click()
    await expect(page.getByTestId('data-sources-panel')).toBeVisible()
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
    // ADR 0011: the live moment is named in the Live activity strip.
    await expect(page.getByTestId('live-event').first()).toContainText('Live scan · Dark 92% · Austria')
  })

  test('UX-7: four headline tiles, each labelled; filtered breakdowns hide; agent states its scope', async ({ page }) => {
    await page.goto('/dashboard?view=product&id=dark-92&market=AT&ask=top-packaging-at')
    const tiles = page.getByTestId('headline-tile')
    await expect(tiles).toHaveCount(4)
    for (let i = 0; i < 4; i++) {
      await expect(tiles.nth(i).getByTestId('evidence-tag')).toHaveCount(1)
      await expect(tiles.nth(i)).toContainText(/Live|Synthetic data/)
    }
    await expect(page.getByTestId('live-activity')).toBeVisible()
    await expect(page.getByTestId('panel-scans')).not.toContainText('By market')
    await expect(page.getByTestId('panel-scans')).toContainText('By campaign')
    await expect(page.getByTestId('agent-scope')).toContainText('Covers: Austria')
    await expect(page.getByTestId('agent-scope')).toContainText('filters do not apply')
  })

  test('UX-8: the collection view lists only questions that span products', async ({ page }) => {
    await page.goto('/dashboard?view=collection&id=vegan-creamy')
    const panel = page.getByTestId('agent-panel')
    await expect(panel.getByRole('link')).toHaveCount(2)
    await expect(panel).not.toContainText('92% bar')
    await expect(page.getByTestId('panel-scans')).toContainText('Collection code, no bar chosen')
  })

  test('P-2: filters apply on change, stay in the URL, and show as removable chips', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: 'Apply' })).toHaveCount(0)
    await page.getByRole('combobox', { name: 'Market', exact: true }).selectOption('AT')
    await expect(page).toHaveURL(/market=AT/)
    await expect(page.getByRole('combobox', { name: 'Market', exact: true })).toHaveValue('AT')
    const chips = page.getByTestId('filter-chips')
    await expect(chips).toContainText('Austria')
    // Every market stays listed; one without scans for this bar is shown but disabled.
    await expect(page.getByRole('combobox', { name: 'Market', exact: true }).locator('option')).toHaveCount(9)
    await chips.getByRole('button', { name: 'Remove filter Austria' }).click()
    await expect(page).not.toHaveURL(/market=/)
    await expect(page.getByTestId('filter-chips')).toHaveCount(0)
  })

  test('P-4: a failed poll keeps the last numbers and shows Reconnecting', async ({ page }) => {
    await page.goto('/dashboard')
    const total = await page.getByTestId('scan-total').getAttribute('data-value')
    await page.route('**/api/dashboard**', (route) => route.abort())
    await expect(page.getByTestId('poll-status')).toContainText('Reconnecting', { timeout: 15_000 })
    await expect(page.getByTestId('scan-total')).toHaveAttribute('data-value', total!)
    await page.unroute('**/api/dashboard**')
    await expect(page.getByTestId('poll-status')).not.toContainText('Reconnecting', { timeout: 15_000 })
  })

  test('P-6: insight cards sit in the product view with a once-per-card check', async ({ page }) => {
    await page.goto('/dashboard?view=product&id=dark-92')
    await expect(page.getByTestId('competitor-panel')).toBeVisible()
    await expect(page.getByTestId('hypotheses-panel')).toBeVisible()
    const check = page.getByTestId('insight-check').first()
    await expect(check).toContainText('Was this useful?')
    await page.route('**/api/insight-check', (route) => route.fulfill({ status: 204 }))
    await check.getByRole('button', { name: 'Yes' }).click()
    await expect(check).toContainText('Thanks')
    await page.reload()
    await expect(page.getByTestId('insight-check').first()).toContainText('Thanks')
  })

  test('RD-6: sticky section links follow the scroll; one key replaces the per-card pills', async ({ page }) => {
    await page.goto('/dashboard')
    const nav = page.getByRole('navigation', { name: 'Sections' })
    await expect(nav.getByRole('link')).toHaveCount(7)
    await expect(page.getByTestId('confidence-key')).toBeVisible()
    for (const id of ['panel-scans', 'panel-feedback']) {
      const tag = page.getByTestId(id).getByTestId('evidence-tag')
      await expect(tag).toHaveText('')
      await expect(tag).toHaveAttribute('aria-label', /^Observed: /)
    }
    await nav.getByRole('link', { name: 'Agent' }).click()
    await expect(nav.getByRole('link', { name: 'Agent' })).toHaveAttribute('aria-current', 'location')
    await expect(page.getByTestId('top-bar')).toBeInViewport()
  })

  test('RD-7: the agent answer streams after a status line, and Stop shows it all', async ({ page }) => {
    await page.goto('/dashboard?ask=top-theme-dark-92')
    const answer = page.getByTestId('agent-answer')
    // The status line shows for under a second (its wording is unit-tested in RD-5); the stream lasts a few seconds.
    await expect(answer.getByTestId('source-list')).toHaveCount(0)
    await answer.getByTestId('agent-stop').click()
    await expect(answer.getByTestId('agent-answer-text')).toContainText('comes up most')
    await expect(answer.getByTestId('source-list')).toBeVisible()
    await expect(answer.getByTestId('insight-check')).toContainText('Was this helpful?')
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test.beforeEach(async ({ context, request, baseURL }) => {
    await signInContext(context, request, baseURL!)
  })

  test('RD-8: numbers show their final value at once and the answer needs no streaming', async ({ page }) => {
    await page.goto('/dashboard?ask=top-theme-dark-92')
    const total = page.getByTestId('scan-total')
    const value = Number(await total.getAttribute('data-value'))
    await expect(total).toHaveText(value.toLocaleString('en-GB'), { timeout: 1000 })
    await expect(page.getByTestId('agent-stop')).toHaveCount(0)
    await expect(page.getByTestId('agent-answer').getByTestId('source-list')).toBeVisible()
  })
})
