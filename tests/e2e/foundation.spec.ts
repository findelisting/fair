import { expect, test } from '@playwright/test'

// Uses the request fixture only, so no browser download is needed.
test('home page shows the demo banner and is not indexable', async ({ request }) => {
  const res = await request.get('/')
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toContain('Demo prototype, synthetic data')
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/)
  expect(res.headers()['x-robots-tag']).toBe('noindex, nofollow')
})

test('security headers are set and no cookie is set', async ({ request }) => {
  const res = await request.get('/')
  const h = res.headers()
  expect(h['x-frame-options']).toBe('DENY')
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(h['x-powered-by']).toBeUndefined()
  expect(h['set-cookie']).toBeUndefined()
})

test('no third-party origins are referenced by the home page', async ({ request }) => {
  const html = await (await request.get('/')).text()
  const origins = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"/]+)/g)].map((m) => m[1])
  expect(origins.filter((o) => !o.includes('localhost'))).toEqual([])
})
