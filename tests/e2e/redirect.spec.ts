import { expect, test } from '@playwright/test'
import { seedPayload } from '../../lib/catalog'
import { deleteTestScans, E2E_LANGUAGE, testDb } from './support/db'

// Spec: docs/specs/slice-2-qr-redirect.md section 7.5. Real database; every request is tagged x-e2e.

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const WHATSAPP = 'WhatsApp/2.24.21.79 A'
const HEADERS = { 'user-agent': IPHONE, 'accept-language': E2E_LANGUAGE }

function expectedPath(code: (typeof seedPayload.codes)[number]): string {
  const p = new URLSearchParams()
  if (code.target_type === 'collection') {
    p.set('collection', code.collection_id!)
    p.set('campaign', code.campaign_id)
    p.set('market', code.market)
    return `/c/${code.collection_id}?${p}`
  }
  p.set('sku', code.sku_id!)
  p.set('campaign', code.campaign_id)
  p.set('market', code.market)
  const base = code.target_type === 'feedback' ? '/f' : '/p'
  if (code.target_type === 'shop') p.set('intent', 'shop')
  return `${base}/${code.sku_id}?${p}`
}

async function countScans(codeId: string, extra: Record<string, unknown> = {}) {
  let q = testDb().from('scan_events').select('*', { count: 'exact', head: true }).eq('code_id', codeId).eq('language', E2E_LANGUAGE)
  for (const [k, v] of Object.entries(extra)) q = q.eq(k, v as never)
  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? 0
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ request }) => {
  await deleteTestScans()
  // Warm up: the dev server compiles the route on first use. HEAD never records.
  await request.head('/r/d92-at', { headers: HEADERS, maxRedirects: 0 })
})

test('E-RD-1 and E-RD-2: every seeded code redirects correctly and records one live scan', async ({ request }) => {
  for (const code of seedPayload.codes) {
    const res = await request.get(`/r/${code.id}`, { headers: HEADERS, maxRedirects: 0 })
    expect(res.status(), code.id).toBe(302)
    expect(res.headers()['x-finde-scan'], code.id).toBe('recorded')
    expect(new URL(res.headers()['location']).pathname + new URL(res.headers()['location']).search, code.id).toBe(expectedPath(code))
  }
  for (const code of seedPayload.codes) {
    const { data, error } = await testDb()
      .from('scan_events')
      .select('sku_id, collection_id, campaign_id, market, source, is_bot, device_type')
      .eq('code_id', code.id)
      .eq('language', E2E_LANGUAGE)
    expect(error).toBeNull()
    expect(data, code.id).toHaveLength(1)
    expect(data![0]).toEqual({
      sku_id: code.sku_id,
      collection_id: code.collection_id,
      campaign_id: code.campaign_id,
      market: code.market,
      source: 'live',
      is_bot: false,
      device_type: 'mobile',
    })
  }
})

test('E-RD-3: a WhatsApp preview is stored as a bot', async ({ request }) => {
  const res = await request.get('/r/oat-de', { headers: { ...HEADERS, 'user-agent': WHATSAPP }, maxRedirects: 0 })
  expect(res.headers()['x-finde-scan']).toBe('bot')
  expect(await countScans('oat-de', { is_bot: true })).toBe(1)
})

test('E-RD-4: HEAD records nothing', async ({ request }) => {
  const before = await countScans('haz-ch')
  const res = await request.head('/r/haz-ch', { headers: HEADERS, maxRedirects: 0 })
  expect(res.status()).toBe(302)
  expect(res.headers()['x-finde-scan']).toBe('head')
  expect(await countScans('haz-ch')).toBe(before)
})

test('E-RD-5: an unknown code goes to /code-inactive and records nothing', async ({ request }) => {
  const res = await request.get('/r/no-such-code', { headers: HEADERS, maxRedirects: 0 })
  expect(res.status()).toBe(302)
  expect(new URL(res.headers()['location']).pathname).toBe('/code-inactive')
  expect(res.headers()['x-finde-scan']).toBe('unknown')
  expect(await countScans('no-such-code')).toBe(0)
})

test('E-RD-6: /code-inactive explains the code is not active and shows the banner', async ({ request }) => {
  const res = await request.get('/code-inactive')
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toMatch(/not active/i)
  expect(html).toContain('Demo prototype, synthetic data')
})

test('E-RD-7: the redirect answers in under a second and the row is visible within 10 seconds', async ({ request }) => {
  const before = await countScans('d92-at')
  const started = Date.now()
  const res = await request.get('/r/d92-at', { headers: HEADERS, maxRedirects: 0 })
  expect(Date.now() - started).toBeLessThan(1_000)
  expect(res.headers()['x-finde-scan']).toBe('recorded')
  await expect.poll(() => countScans('d92-at'), { timeout: 10_000 }).toBe(before + 1)
})

test('E-RD-8: cleanup removes every test scan', async () => {
  await deleteTestScans()
  const { count } = await testDb().from('scan_events').select('*', { count: 'exact', head: true }).eq('language', E2E_LANGUAGE)
  expect(count).toBe(0)
})
