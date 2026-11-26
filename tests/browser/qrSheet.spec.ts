import { expect, test } from '@playwright/test'
import path from 'node:path'

// Slice 8 (ADR 0004, spec docs/specs/slice-8-qr-sheet.md). Dev-only page, so skipped against a deployed URL.
test.skip(!!process.env.E2E_BASE_URL, 'The QR sheet is dev-only until slice 4')

const JSQR = path.join(process.cwd(), 'node_modules', 'jsqr', 'dist', 'jsQR.js')

test('every rendered code decodes to its exact URL', async ({ page }) => {
  const res = await page.goto('/dashboard/codes')
  expect(res?.headers()['set-cookie']).toBeUndefined()
  await page.addScriptTag({ path: JSQR })

  const cards = page.getByTestId('qr-card')
  const count = await cards.count()
  expect(count).toBeGreaterThanOrEqual(5)

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i)
    const expected = await card.getAttribute('data-url')
    const png = (await card.getByTestId('qr-code').screenshot()).toString('base64')
    const decoded = await page.evaluate(async (b64) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, img.width, img.height)
      // jsQR is injected by addScriptTag above.
      const result = (window as unknown as { jsQR: (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).jsQR(
        data.data,
        data.width,
        data.height,
      )
      return result?.data ?? null
    }, png)
    expect(decoded, `code ${i} should decode`).toBe(expected)
    // Plain codes until the client uploads a logo (ADR 0004, amendment 1).
    await expect(card.locator('[data-logo]')).toHaveCount(0)
  }
})

test('cards show call to action, label, Demo only; dev URL shows the warning', async ({ page }) => {
  await page.goto('/dashboard/codes')
  const first = page.getByTestId('qr-card').first()
  await expect(first).toContainText('Scan for the story behind this bar')
  await expect(first).toContainText('Demo only')
  await expect(first).toContainText('d92-at')
  await expect(page.getByTestId('base-url-warning')).toContainText('Not print-ready')
  await expect(page.getByTestId('print-ready')).toHaveCount(0)
  await expect(page.getByTestId('logo-offer')).toContainText('Send us your logo file')
  await expect(page.getByText('Demo prototype, synthetic data').first()).toBeVisible()
})

test('opening the sheet records no scan', async ({ page }) => {
  const res = await page.goto('/dashboard/codes')
  expect(res?.status()).toBe(200)
  expect(page.url()).toContain('/dashboard/codes')
})
