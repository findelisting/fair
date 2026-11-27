import { expect, test, type Page } from '@playwright/test'
import { IPHONE, testDb } from './support'

// Spec: docs/specs/slice-3-public-pages-and-feedback.md section 8.2 (B-PG-*). Real demo database.

test.use({ userAgent: IPHONE, viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: 'serial' })

const PRODUCT = '/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT'
// A bar without brand links, so Shop and Watch the story stay labelled demo buttons (Dark 92% links out since b49985e).
const DEMO_PRODUCT = '/p/creamy-oat?sku=creamy-oat&campaign=wrapper-2026&market=DE'
const COLLECTION = '/c/vegan-creamy?collection=vegan-creamy&campaign=influencer-q4-2026&market=DE'
const FEEDBACK = '/f/creamy-oat?sku=creamy-oat&campaign=influencer-q4-2026&market=DE'
const BANNER = 'Demo prototype, synthetic data'

async function pageViews(filter: Record<string, string | null>, since: string) {
  let q = testDb().from('page_views').select('*').gte('ts', since)
  for (const [k, v] of Object.entries(filter)) q = v === null ? q.is(k, null) : q.eq(k, v)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

test('B-PG-1: product page shows the product and demo buttons', async ({ page }) => {
  await page.goto(PRODUCT)
  await expect(page.getByRole('heading', { name: 'Dark 92%' })).toBeVisible()
  await expect(page.getByText('92% dark chocolate')).toBeVisible()
  await expect(page.getByText('80 g')).toBeVisible()
  await expect(page.getByText(BANNER)).toBeVisible()
  const feedback = page.getByRole('link', { name: /give feedback/i })
  await expect(feedback).toHaveAttribute('href', '/f/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT')
  await page.goto(DEMO_PRODUCT)
  for (const name of [/^shop/i, /watch the story/i]) {
    await expect(page.getByRole('button', { name })).toBeVisible()
    await expect(page.getByRole('link', { name })).toHaveCount(0)
  }
  await expect(page.getByText(/demo: links to the brand's own shop/i)).toBeVisible()
  await expect(page.getByText(/demo: the video stays on the brand's own site/i)).toBeVisible()
  await expect(page.locator('video, iframe')).toHaveCount(0)
})

test('UX-9: product page shows a labelled demo story and a text wordmark, no logo placeholder', async ({ page }) => {
  await page.goto(PRODUCT)
  await expect(page.getByTestId('product-story')).toContainText('Made in Ghana')
  await expect(page.getByText('Demo content')).toBeVisible()
  await expect(page.getByTestId('brand-wordmark')).toHaveText('fairafric')
  await expect(page.getByText('fairafric logo')).toHaveCount(0)
})

test('UX-10: the thanks page offers Shop and Watch the story', async ({ page }) => {
  await page.goto('/f/dark-92/thanks?sku=dark-92&campaign=wrapper-2026&market=AT')
  const next = page.getByTestId('thanks-next')
  await expect(next.getByTestId('brand-link')).toHaveCount(2)
  await expect(next.getByRole('link', { name: /Shop/ })).toHaveAttribute('rel', /noopener/)
})

test('B-PG-2: a shop code highlights the shop button', async ({ page }) => {
  await page.goto(`${DEMO_PRODUCT}&intent=shop`)
  await expect(page.getByRole('button', { name: /^shop/i })).toHaveAttribute('data-highlight', 'true')
  await page.goto(DEMO_PRODUCT)
  await expect(page.getByRole('button', { name: /^shop/i })).toHaveAttribute('data-highlight', 'false')
})

test('B-PG-3: an unknown product shows a 404 with the banner', async ({ page }) => {
  const res = await page.goto('/p/nope')
  expect(res?.status()).toBe(404)
  await expect(page.getByText(BANNER)).toBeVisible()
})

test('B-PG-4: the collection page lists its products in order with parameters', async ({ page }) => {
  await page.goto(COLLECTION)
  await expect(page.getByRole('heading', { name: 'Vegan Creamy line' })).toBeVisible()
  const links = page.locator('a[data-sku]')
  await expect(links).toHaveCount(2)
  await expect(links.nth(0)).toHaveAttribute('href', '/p/creamy-oat?sku=creamy-oat&campaign=influencer-q4-2026&market=DE')
  await expect(links.nth(1)).toHaveAttribute('href', '/p/creamy-hazelnut?sku=creamy-hazelnut&campaign=influencer-q4-2026&market=DE')
})

test('B-PG-5: product, collection and feedback pages each record one live page view', async ({ page }) => {
  // A campaign and market combination that no other test uses, so parallel tests cannot add views here.
  const q = 'campaign=trade-fair-2027&market=FR'
  const since = new Date().toISOString()
  await page.goto(`/p/dark-92?sku=dark-92&${q}`)
  await page.goto(`/c/vegan-creamy?collection=vegan-creamy&${q}`)
  await page.goto(`/f/creamy-oat?sku=creamy-oat&${q}`)
  const base = { campaign_id: 'trade-fair-2027', market: 'FR', source: 'live' }
  await expect.poll(async () => (await pageViews({ ...base, page: 'product', sku_id: 'dark-92' }, since)).length).toBe(1)
  await expect.poll(async () => (await pageViews({ ...base, page: 'collection', collection_id: 'vegan-creamy' }, since)).length).toBe(1)
  await expect.poll(async () => (await pageViews({ ...base, page: 'feedback', sku_id: 'creamy-oat' }, since)).length).toBe(1)
  // Still exactly one each a moment later: no late duplicates.
  await page.waitForTimeout(1_500)
  expect(await pageViews({ ...base, page: 'product', sku_id: 'dark-92' }, since)).toHaveLength(1)
})

test('B-PG-6: a bot does not record a page view', async ({ browser }) => {
  const since = new Date().toISOString()
  const ctx = await browser.newContext({ userAgent: 'WhatsApp/2.24.21.79 A' })
  const page = await ctx.newPage()
  await page.goto('/p/creamy-hazelnut?sku=creamy-hazelnut&campaign=trade-fair-2027&market=GH')
  await page.waitForTimeout(2_000)
  expect(await pageViews({ sku_id: 'creamy-hazelnut', campaign_id: 'trade-fair-2027', market: 'GH' }, since)).toHaveLength(0)
  await ctx.close()
})

test('B-PG-7: links between tracked pages are full page loads, never prefetched', async ({ page }) => {
  await page.goto(COLLECTION)
  const navigations: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/p/creamy-oat')) navigations.push(r.resourceType())
  })
  await page.locator('a[data-sku="creamy-oat"]').click()
  await expect(page).toHaveURL(/\/p\/creamy-oat/)
  expect(navigations).toContain('document')
})

async function assertMobileFriendly(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  for (const el of await page.locator('main a, main button').all()) {
    const box = await el.boundingBox()
    if (box) expect(box.height, await el.textContent() ?? '').toBeGreaterThanOrEqual(44)
  }
}

test('B-PG-8: every public page fits a phone and has large tap targets', async ({ page }) => {
  for (const url of [PRODUCT, COLLECTION, FEEDBACK, '/f/dark-92/thanks?sku=dark-92&campaign=wrapper-2026&market=AT', '/code-inactive']) {
    await page.goto(url)
    await assertMobileFriendly(page)
  }
})

test('B-PG-9: no cookies and no requests to other sites', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const foreign: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.protocol.startsWith('http') && u.origin !== origin) foreign.push(r.url())
  })
  for (const url of [PRODUCT, COLLECTION, FEEDBACK, '/code-inactive']) await page.goto(url)
  expect(foreign).toEqual([])
  expect(await context.cookies()).toEqual([])
})
