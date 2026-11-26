import { expect, test } from '@playwright/test'
import { demoPassword, sessionCookie } from './support/auth'
import { E2E_FEEDBACK_MARK, testDb } from './support/db'

// Slice 4 (ADR 0007, spec docs/specs/slice-4-dashboard.md). Real database.


test('G-1: gated pages redirect to the login page', async ({ request }) => {
  // A trailing slash is first normalised by Next (308 to /dashboard), which is then gated.
  const slash = await request.get('/dashboard/', { maxRedirects: 0 })
  expect([307, 308]).toContain(slash.status())
  expect(slash.headers()['location']).toMatch(/^\/dashboard$|\/login\?next=/)
  for (const path of ['/dashboard', '/dashboard/codes', '/dashboard?view=collection&id=vegan-creamy']) {
    const res = await request.get(path, { maxRedirects: 0 })
    expect(res.status(), path).toBe(307)
    expect(res.headers()['location'], path).toContain('/login?next=')
  }
})

test('G-2: gated APIs return 401 without a session', async ({ request }) => {
  for (const path of ['/api/dashboard?view=product&id=dark-92', '/api/agent?q=top-packaging-at', '/api/insight-check']) {
    const res = await request.get(path, { maxRedirects: 0 })
    expect(res.status(), path).toBe(401)
    expect(await res.json()).toEqual({ error: 'sign in required' })
  }
  const forged = await request.get('/api/dashboard?view=product&id=dark-92', { headers: { cookie: 'finde_demo_session=v1.9999999999.forged' } })
  expect(forged.status()).toBe(401)
})

test('G-3 and G-4: right password sets one hardened cookie; wrong password does not', async ({ request }) => {
  const wrong = await request.post('/api/login', { form: { password: 'definitely-wrong', next: '/dashboard' }, maxRedirects: 0 })
  expect(wrong.status()).toBe(303)
  expect(wrong.headers()['set-cookie']).toBeUndefined()
  expect(wrong.headers()['location']).toContain('/login?error=wrong')

  const ok = await request.post('/api/login', { form: { password: demoPassword(), next: '//evil.example' }, maxRedirects: 0 })
  expect(ok.status()).toBe(303)
  const cookie = ok.headers()['set-cookie']
  expect(cookie).toMatch(/finde_demo_session=/)
  expect(cookie).toMatch(/HttpOnly/i)
  expect(cookie).toMatch(/SameSite=Lax/i)
  expect(cookie).toMatch(/Max-Age=604800/)
  expect(new URL(ok.headers()['location'], 'http://x').pathname).toBe('/dashboard')
})

test('G-8: public pages need no password and set no cookie', async ({ request }) => {
  for (const path of ['/p/dark-92', '/c/vegan-creamy', '/f/dark-92', '/login']) {
    const res = await request.get(path, { maxRedirects: 0 })
    expect(res.status(), path).toBe(200)
    expect(res.headers()['set-cookie'], path).toBeUndefined()
  }
})

test('D-6: the API validates parameters and is never cached', async ({ request }) => {
  const cookie = await sessionCookie(request)
  const bad = await request.get('/api/dashboard?view=product&id=nope', { headers: { cookie } })
  expect(bad.status()).toBe(400)
  const res = await request.get('/api/dashboard?view=product&id=dark-92&market=AT', { headers: { cookie } })
  expect(res.status()).toBe(200)
  expect(res.headers()['cache-control']).toContain('no-store')
  const body = await res.json()
  expect(body.scans.total.synthetic).toBeGreaterThan(0)
  expect(Object.keys(body.scans.byMarket.reduce((m: Record<string, 1>, r: { key: string }) => ({ ...m, [r.key]: 1 }), {}))).toEqual(['AT'])
  expect(body.web.total.sessions).toBeGreaterThan(0)
  expect(typeof body.asOf).toBe('string')
})

// The live-scan timing test is in tests/browser/dashboard.spec.ts: the browser project runs after
// the redirect tests, which count scans per code exactly.

test('Feedback appears with SKU, campaign and market', async ({ request }) => {
  const cookie = await sessionCookie(request)
  const text = `${E2E_FEEDBACK_MARK} dashboard check ${Date.now()}`
  const { error } = await testDb().from('feedback').insert({
    sku_id: 'creamy-hazelnut', campaign_id: 'shelf-q4-2026', market: 'CH', rating: 5,
    taste_note: 'smooth-creamy', free_text: text, themes: ['texture'], source: 'live',
  })
  expect(error).toBeNull()
  const body = await (await request.get('/api/dashboard?view=product&id=creamy-hazelnut', { headers: { cookie } })).json()
  const row = body.feedback.recent.find((r: { freeText: string | null }) => r.freeText === text)
  expect(row).toMatchObject({ campaign: 'shelf-q4-2026', market: 'CH', rating: 5, tasteNote: 'smooth-creamy' })
})

test('Collection view and filters narrow the numbers', async ({ request }) => {
  const cookie = await sessionCookie(request)
  const get = async (q: string) => (await request.get(`/api/dashboard?${q}`, { headers: { cookie } })).json()
  const all = await get('view=collection&id=vegan-creamy')
  const de = await get('view=collection&id=vegan-creamy&market=DE')
  const skus = all.scans.bySku.map((r: { key: string }) => r.key).sort()
  expect(skus).toEqual(['creamy-hazelnut', 'creamy-oat'])
  expect(de.scans.total.synthetic).toBeLessThan(all.scans.total.synthetic)
  const shelf = await get('view=product&id=dark-92&campaign=shelf-q4-2026')
  expect(shelf.scans.byCampaign.map((r: { key: string }) => r.key)).toEqual(['shelf-q4-2026'])
})

test('P-7: insight check stores a known card and rejects others', async ({ request }) => {
  const cookie = await sessionCookie(request)
  const ok = await request.post('/api/insight-check', { headers: { cookie }, data: { cardId: 'market-context:dark-92', answer: 'up' } })
  expect(ok.status()).toBe(204)
  const bad = await request.post('/api/insight-check', { headers: { cookie }, data: { cardId: 'nope', answer: 'up' } })
  expect(bad.status()).toBe(400)
  const badAnswer = await request.post('/api/insight-check', { headers: { cookie }, data: { cardId: 'ideas:dark-92', answer: 'maybe' } })
  expect(badAnswer.status()).toBe(400)
  await testDb().from('insight_checks').delete().gte('ts', new Date(Date.now() - 60_000).toISOString())
})

test('P-8: the QR sheet opens behind the gate', async ({ request }) => {
  const cookie = await sessionCookie(request)
  const res = await request.get('/dashboard/codes', { headers: { cookie } })
  expect(res.status()).toBe(200)
  expect(await res.text()).toContain('d92-at')
})
