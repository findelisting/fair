import { expect, test, type Page } from '@playwright/test'
import { signInContext } from '../e2e/support/auth'
import { FORM_URL } from './support'

// Slice 10 (ADR 0008, spec docs/specs/slice-10-hardening.md): runtime checks in Chromium.

const PUBLIC = ['/', '/login', '/p/dark-92', '/p/creamy-oat', '/p/creamy-hazelnut', '/c/vegan-creamy', FORM_URL, '/code-inactive', '/no-such-page']
const GATED = ['/dashboard', '/dashboard?view=collection&id=vegan-creamy', '/dashboard/codes']

const secrets = () =>
  ['SUPABASE_SERVICE_ROLE_KEY', 'DEMO_DASHBOARD_PASSWORD', 'DEMO_SESSION_SECRET', 'SUPABASE_DB_URL']
    .map((k) => process.env[k])
    .filter((v): v is string => !!v && v.length >= 8)

/** Opens a page and records every request, every Set-Cookie and every script body. */
async function visit(page: Page, path: string) {
  const requests: string[] = []
  const setCookies: string[] = []
  const scripts: Promise<string>[] = []
  page.on('request', (r) => requests.push(r.url()))
  page.on('response', (r) => {
    const sc = r.headers()['set-cookie']
    if (sc) setCookies.push(`${r.url()} ${sc}`)
    if (r.request().resourceType() === 'script' || r.url().endsWith('.js')) scripts.push(r.text().catch(() => ''))
  })
  const res = await page.goto(path)
  await page.waitForLoadState('networkidle')
  return { res, requests, setCookies, scripts: await Promise.all(scripts) }
}

async function expectBannerAndNoindex(page: Page, path: string, headers: Record<string, string>) {
  await expect(page.getByText('Demo prototype, synthetic data').first(), path).toBeVisible()
  const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute('content') ?? ''))
  expect(robots.length, path).toBeGreaterThan(0)
  expect(robots.every((c) => c.includes('noindex')), path).toBe(true)
  expect(headers['x-robots-tag'] ?? '', path).toMatch(/noindex/)
}

test('H-1 to H-4: public pages show the banner, are noindex, set no cookie and call no third party', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  for (const path of PUBLIC) {
    const { res, requests, setCookies } = await visit(page, path)
    await expectBannerAndNoindex(page, path, res!.headers())
    expect(setCookies, path).toEqual([])
    expect(await page.evaluate(() => document.cookie), path).toBe('')
    const foreign = requests.filter((u) => !u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:'))
    expect(foreign, path).toEqual([])
    expect(await page.locator('video, iframe, embed, object').count(), path).toBe(0)
    page.removeAllListeners('request')
    page.removeAllListeners('response')
  }
})

test('H-1, H-2: gated pages show the banner and are noindex', async ({ page, context, request, baseURL }) => {
  await signInContext(context, request, baseURL!)
  for (const path of GATED) {
    const res = await page.goto(path)
    await expectBannerAndNoindex(page, path, res!.headers())
  }
})

test('H-6: the feedback form asks for no contact details', async ({ page }) => {
  await page.goto(FORM_URL)
  expect(await page.locator('input[type="email"], input[type="tel"], input[autocomplete~="email"], input[autocomplete~="name"], input[autocomplete~="tel"]').count()).toBe(0)
  const names = await page.locator('form input, form textarea, form select').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).name))
  expect(names.filter((n) => /name|mail|phone|tel|address|contact/i.test(n) && n !== 'submission_id')).toEqual([])
})

test('H-8: no secret value reaches the browser', async ({ page, context, request, baseURL }) => {
  const values = secrets()
  expect(values.length).toBeGreaterThanOrEqual(2)
  await signInContext(context, request, baseURL!)
  for (const path of ['/', '/p/dark-92', FORM_URL, '/dashboard', '/dashboard/codes']) {
    const { scripts } = await visit(page, path)
    const html = await page.content()
    for (const body of [html, ...scripts]) for (const v of values) expect(body.includes(v), `${path} leaks a secret`).toBe(false)
    page.removeAllListeners('request')
    page.removeAllListeners('response')
  }
})
