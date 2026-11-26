import { expect, test } from '@playwright/test'

// Spec: docs/specs/slice-6-product-agent.md section 7.3. Dev-only preview until slice 4 embeds the panel.

test.describe('JavaScript off', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })

  test('B-AG-1: each question shows an answer with dated sources', async ({ page }) => {
    await page.goto('/preview/agent')
    const questions = [
      'Which packaging had the most scans in Austria?',
      'Which campaign drove visits to the feedback page?',
      'Which theme comes up most for the 92% bar?',
      'What do comparable dark bars cost?',
    ]
    for (const q of questions) {
      await page.getByRole('link', { name: q }).click()
      const panel = page.getByTestId('agent-answer')
      await expect(panel.getByRole('heading', { name: q })).toBeVisible()
      await expect(panel.getByTestId('agent-answer-text')).not.toBeEmpty()
      await expect(panel.getByTestId('source-list')).toContainText('Sources')
      await expect(panel.getByTestId('source-list')).toContainText(/\d{4}/)
    }
  })

  test('B-AG-3: the panel fits a 390 px phone', async ({ page }) => {
    await page.goto('/preview/agent?ask=top-packaging-at')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test('B-AG-2: question links are built by the host page, so its filters stay', async ({ page }) => {
  await page.goto('/preview/agent?market=AT')
  await expect(page.getByRole('link', { name: 'Which theme comes up most for the 92% bar?' })).toHaveAttribute(
    'href',
    '/preview/agent?market=AT&ask=top-theme-dark-92',
  )
})
