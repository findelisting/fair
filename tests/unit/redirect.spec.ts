import { expect, test } from '@playwright/test'
import { fallbackCode } from '../../lib/catalog'
import { createLimiter } from '../../lib/rateLimit'
import { createRedirectHandler, type CodeTarget, type RedirectDeps, type ScanInput } from '../../lib/redirect'

// Spec: docs/specs/slice-2-qr-redirect.md section 7.3. Fake database, limiter and scheduler.

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const WHATSAPP = 'WhatsApp/2.24.21.79 A'

const DB: Record<string, CodeTarget> = {
  'd92-at': { status: 'active', target_type: 'product', sku_id: 'dark-92', collection_id: null, campaign_id: 'wrapper-2026', market: 'AT' },
  'fb-d92': { status: 'active', target_type: 'feedback', sku_id: 'dark-92', collection_id: null, campaign_id: 'shelf-q4-2026', market: 'AT' },
  'shop-1': { status: 'active', target_type: 'shop', sku_id: 'creamy-oat', collection_id: null, campaign_id: 'wrapper-2026', market: 'DE' },
  'vc-de': { status: 'active', target_type: 'collection', sku_id: null, collection_id: 'vegan-creamy', campaign_id: 'influencer-q4-2026', market: 'DE' },
  'old-1': { status: 'inactive', target_type: 'product', sku_id: 'dark-92', collection_id: null, campaign_id: 'wrapper-2026', market: 'AT' },
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function setup(overrides: Partial<RedirectDeps> = {}) {
  const calls: ScanInput[] = []
  const scheduled: (() => Promise<unknown>)[] = []
  const logs: string[] = []
  const deps: RedirectDeps = {
    recordScan: async (input) => {
      calls.push(input)
      return DB[input.code] ?? null
    },
    fallback: fallbackCode,
    schedule: (task) => { scheduled.push(task) },
    limiter: createLimiter(),
    siteUrl: 'https://fairafric-demo.thefindeapp.com',
    env: {},
    log: (m) => { logs.push(m) },
    budgetMs: 800,
    hardLimitMs: 5_000,
    ...overrides,
  }
  return { handler: createRedirectHandler(deps), calls, scheduled, logs }
}

function req(path: string, headers: Record<string, string> = {}, method = 'GET') {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: { 'user-agent': IPHONE, 'accept-language': 'de-AT,de;q=0.9', 'x-forwarded-for': '203.0.113.7', ...headers },
  })
}

function location(res: Response) {
  return res.headers.get('location')
}

test('U-RD-1: active product code redirects with sku, campaign and market, and records', async () => {
  const { handler, calls } = setup()
  const res = await handler(req('/r/d92-at'), 'GET', 'd92-at')
  expect(res.status).toBe(302)
  expect(location(res)).toBe('http://localhost:3000/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT')
  expect(res.headers.get('x-finde-scan')).toBe('recorded')
  expect(calls).toEqual([{ code: 'd92-at', record: true, device: 'mobile', language: 'de-at', isBot: false }])
})

test('U-RD-2: feedback, shop and collection targets', async () => {
  const { handler } = setup()
  expect(location(await handler(req('/r/fb-d92'), 'GET', 'fb-d92'))).toBe(
    'http://localhost:3000/f/dark-92?sku=dark-92&campaign=shelf-q4-2026&market=AT',
  )
  expect(location(await handler(req('/r/shop-1'), 'GET', 'shop-1'))).toBe(
    'http://localhost:3000/p/creamy-oat?sku=creamy-oat&campaign=wrapper-2026&market=DE&intent=shop',
  )
  expect(location(await handler(req('/r/vc-de'), 'GET', 'vc-de'))).toBe(
    'http://localhost:3000/c/vegan-creamy?collection=vegan-creamy&campaign=influencer-q4-2026&market=DE',
  )
})

test('U-RD-3: an uppercase slug works like the lowercase one', async () => {
  const { handler, calls } = setup()
  const res = await handler(req('/r/D92-AT'), 'GET', 'D92-AT')
  expect(location(res)).toBe('http://localhost:3000/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT')
  expect(calls[0].code).toBe('d92-at')
})

test('U-RD-4: invalid slugs go to /code-inactive without a database call', async () => {
  const { handler, calls } = setup()
  for (const slug of ['a', 'x'.repeat(33), '<script>', 'd92_at', '../etc', '']) {
    const res = await handler(req('/r/x'), 'GET', slug)
    expect(res.status).toBe(302)
    expect(location(res)).toBe('http://localhost:3000/code-inactive')
    expect(res.headers.get('x-finde-scan')).toBe('invalid')
  }
  expect(calls).toHaveLength(0)
})

test('U-RD-5: an unknown code goes to /code-inactive', async () => {
  const { handler } = setup()
  const res = await handler(req('/r/nope'), 'GET', 'nope')
  expect(location(res)).toBe('http://localhost:3000/code-inactive')
  expect(res.headers.get('x-finde-scan')).toBe('unknown')
})

test('U-RD-6: an inactive code goes to /code-inactive', async () => {
  const { handler } = setup()
  const res = await handler(req('/r/old-1'), 'GET', 'old-1')
  expect(location(res)).toBe('http://localhost:3000/code-inactive')
  expect(res.headers.get('x-finde-scan')).toBe('inactive')
})

test('U-RD-7: HEAD redirects but never records', async () => {
  const { handler, calls } = setup()
  const res = await handler(req('/r/d92-at', {}, 'HEAD'), 'HEAD', 'd92-at')
  expect(res.status).toBe(302)
  expect(location(res)).toBe('http://localhost:3000/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT')
  expect(res.headers.get('x-finde-scan')).toBe('head')
  expect(calls[0].record).toBe(false)
})

test('U-RD-8: a bot user agent is recorded as a bot', async () => {
  const { handler, calls } = setup()
  const res = await handler(req('/r/d92-at', { 'user-agent': WHATSAPP }), 'GET', 'd92-at')
  expect(res.headers.get('x-finde-scan')).toBe('bot')
  expect(calls[0]).toMatchObject({ record: true, isBot: true })
})

test('U-RD-9: over the rate limit the phone is still redirected, without a record', async () => {
  const { handler, calls } = setup({ limiter: createLimiter(1, 60_000) })
  await handler(req('/r/d92-at'), 'GET', 'd92-at')
  const res = await handler(req('/r/d92-at'), 'GET', 'd92-at')
  expect(res.status).toBe(302)
  expect(location(res)).toBe('http://localhost:3000/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT')
  expect(res.headers.get('x-finde-scan')).toBe('rate-limited')
  expect(calls[1].record).toBe(false)
})

test('U-RD-10: database error, code in the fallback table: redirect from the table', async () => {
  const { handler, logs } = setup({ recordScan: async () => { throw new Error('connection refused') } })
  const res = await handler(req('/r/d92-at'), 'GET', 'd92-at')
  expect(location(res)).toBe('http://localhost:3000/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT')
  expect(res.headers.get('x-finde-scan')).toBe('fallback')
  expect(logs.join('\n')).toMatch(/d92-at/)
})

test('U-RD-11: database error, code not in the fallback table: /code-inactive', async () => {
  const { handler } = setup({ recordScan: async () => { throw new Error('down') } })
  const res = await handler(req('/r/not-seeded'), 'GET', 'not-seeded')
  expect(location(res)).toBe('http://localhost:3000/code-inactive')
  expect(res.headers.get('x-finde-scan')).toBe('unknown')
})

test('U-RD-12: a slow database: answer at the budget, hand the write to the scheduler', async () => {
  let finished = false
  const { handler, scheduled } = setup({
    budgetMs: 50,
    hardLimitMs: 1_000,
    recordScan: async (input) => {
      await sleep(200)
      finished = true
      return DB[input.code] ?? null
    },
  })
  const started = Date.now()
  const res = await handler(req('/r/d92-at'), 'GET', 'd92-at')
  const took = Date.now() - started
  expect(took).toBeLessThan(180)
  expect(res.headers.get('x-finde-scan')).toBe('late')
  expect(location(res)).toBe('http://localhost:3000/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT')
  expect(scheduled).toHaveLength(1)
  await scheduled[0]()
  expect(finished).toBe(true)
})

test('U-RD-13: a database that never answers is aborted at the hard limit', async () => {
  let aborted = false
  const { handler, scheduled } = setup({
    budgetMs: 20,
    hardLimitMs: 100,
    recordScan: (_input, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')) })
      }),
  })
  const res = await handler(req('/r/d92-at'), 'GET', 'd92-at')
  expect(res.headers.get('x-finde-scan')).toBe('late')
  // The scheduled task settles (does not hang, does not throw) once the call is aborted.
  await Promise.race([scheduled[0](), sleep(1_000).then(() => { throw new Error('scheduled task hung') })])
  expect(aborted).toBe(true)
})

test('U-RD-14: the incoming query string is ignored', async () => {
  const { handler } = setup()
  const res = await handler(req('/r/d92-at?sku=evil&market=XX&campaign=x'), 'GET', 'd92-at')
  expect(location(res)).toBe('http://localhost:3000/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT')
})

test('U-RD-15: in production the origin is PUBLIC_BASE_URL, never the Host header', async () => {
  const { handler } = setup({ env: { VERCEL_ENV: 'production' } })
  const forged = new Request('https://evil.example/r/d92-at', { headers: { host: 'evil.example', 'user-agent': IPHONE } })
  const res = await handler(forged, 'GET', 'd92-at')
  expect(location(res)).toBe('https://fairafric-demo.thefindeapp.com/p/dark-92?sku=dark-92&campaign=wrapper-2026&market=AT')
  const invalid = await handler(forged, 'GET', '<bad>')
  expect(location(invalid)).toBe('https://fairafric-demo.thefindeapp.com/code-inactive')
})

test('U-RD-16: every response is no-store and sets no cookie', async () => {
  const { handler } = setup({ recordScan: async () => { throw new Error('down') } })
  for (const [slug, method] of [['d92-at', 'GET'], ['d92-at', 'HEAD'], ['<bad>', 'GET'], ['nope', 'GET']] as const) {
    const res = await handler(req('/r/x', {}, method), method, slug)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('set-cookie')).toBeNull()
  }
})

test('U-RD-17: logs contain no IP address and no user agent', async () => {
  const { handler, logs } = setup({ recordScan: async () => { throw new Error('boom') } })
  await handler(req('/r/d92-at'), 'GET', 'd92-at')
  const text = logs.join('\n')
  expect(text.length).toBeGreaterThan(0)
  expect(text).not.toContain('203.0.113.7')
  expect(text).not.toContain('iPhone')
})
