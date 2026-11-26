import { expect, test, type APIRequestContext } from '@playwright/test'
import { sessionCookie } from './support/auth'
import { E2E_LANGUAGE, testDb } from './support/db'

// Spec: docs/specs/slice-6-product-agent.md section 7.2. Real database with slice 5 synthetic data.
// Checks winners and margins, never exact numbers, so live rows cannot make these tests flaky.
// /api/agent sits behind the slice 4 demo password gate (ADR 0007), so every request signs in first.

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

interface Answer {
  id: string
  question: string
  answer: string
  sources: { name: string; detail?: string; url?: string; date: string; kind?: string }[]
  asOf: string
  counts?: { live: number; synthetic: number }
}

let cookie = ''

async function ask(request: APIRequestContext, q: string): Promise<Answer> {
  const res = await request.get(`/api/agent?q=${q}`, { headers: { cookie } })
  expect(res.status(), q).toBe(200)
  return res.json()
}

/** First two numbers in a sentence: winner and runner-up (or winner and total). */
function numbers(sentence: string): number[] {
  return [...sentence.matchAll(/(\d[\d,]*)/g)].map((m) => Number(m[1].replace(/,/g, '')))
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ request }) => {
  cookie = await sessionCookie(request)
})

test('E-AG-9: without a session the agent API is refused', async ({ request }) => {
  expect((await request.get('/api/agent?q=top-theme-dark-92')).status()).toBe(401)
})

test('E-AG-0: synthetic data is loaded (otherwise run npm run seed)', async () => {
  const { count, error } = await testDb().from('scan_events').select('*', { count: 'exact', head: true }).eq('source', 'synthetic')
  expect(error).toBeNull()
  expect(count, 'No synthetic data: run npm run seed').toBeGreaterThan(0)
})

test('E-AG-1: Austria: the Dark 92% wrapper code leads by at least 1.5 times', async ({ request }) => {
  const a = await ask(request, 'top-packaging-at')
  expect(a.answer).toMatch(/^The Dark 92% wrapper code had the most scans in Austria: /)
  const [winner, runnerUp] = numbers(a.answer.replace('92%', ''))
  expect(winner).toBeGreaterThanOrEqual(runnerUp * 1.5)
})

test('E-AG-2: the shelf talker campaign has the most feedback-page visits', async ({ request }) => {
  const a = await ask(request, 'feedback-visits-by-campaign')
  expect(a.answer).toMatch(/^Most feedback-page visits came from the Shelf talker, Q4 campaign: /)
})

test('E-AG-3: bitterness leads for the 92% bar', async ({ request }) => {
  const a = await ask(request, 'top-theme-dark-92')
  expect(a.answer).toMatch(/^Bitterness comes up most in feedback on the Dark 92% bar: /)
})

test('E-AG-4: comparable dark bars come from public listings with sources', async ({ request }) => {
  const a = await ask(request, 'comparable-dark-bars')
  expect(a.answer).toContain('Lindt Excellence Mild 90%, ~€5.09 for 100 g')
  expect(a.sources.length).toBeGreaterThan(0)
  for (const s of a.sources) {
    expect(s.url).toMatch(/^https:\/\//)
    expect(s.date).toMatch(/\d{4}/)
  }
})

test('E-AG-5: every data answer has a source with rows and a date', async ({ request }) => {
  for (const q of ['top-packaging-at', 'feedback-visits-by-campaign', 'top-theme-dark-92']) {
    const a = await ask(request, q)
    expect(a.sources.length, q).toBeGreaterThan(0)
    expect(a.sources[0].detail, q).toMatch(/[1-9][\d,]* rows/)
    expect(a.sources[0].date, q).toMatch(/\d{1,2} \w{3} \d{4}, \d{2}:\d{2}/)
  }
})

test('E-AG-6: a live scan in Austria raises the live count by one', async ({ request }) => {
  const before = await ask(request, 'top-packaging-at')
  const scan = await request.get('/r/d92-at', { headers: { 'user-agent': IPHONE, 'accept-language': E2E_LANGUAGE }, maxRedirects: 0 })
  expect(scan.headers()['x-finde-scan']).toBe('recorded')
  await expect.poll(async () => (await ask(request, 'top-packaging-at')).counts?.live, { timeout: 10_000 }).toBe((before.counts?.live ?? 0) + 1)
  const after = await ask(request, 'top-packaging-at')
  expect(after.sources[0].kind).toBe('mixed')
})

test('E-AG-7: unknown or missing questions are refused', async ({ request }) => {
  expect((await request.get('/api/agent?q=nope', { headers: { cookie } })).status()).toBe(400)
  expect((await request.get('/api/agent', { headers: { cookie } })).status()).toBe(400)
})

test('E-AG-8: answers are never cached and set no cookie', async ({ request }) => {
  const res = await request.get('/api/agent?q=top-theme-dark-92', { headers: { cookie } })
  expect(res.headers()['cache-control']).toContain('no-store')
  expect(res.headers()['set-cookie']).toBeUndefined()
})
