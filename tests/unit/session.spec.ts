import { expect, test } from '@playwright/test'
import { passwordMatches, safeNext, signSession, verifySession, SESSION_MAX_AGE_S } from '@/lib/session'

// Slice 4 gate (ADR 0007, spec docs/specs/slice-4-dashboard.md).
const secret = 'test-secret-0123456789abcdef'
const now = Date.parse('2026-11-26T12:00:00Z')

test('G-3: a signed session verifies for 7 days, then expires', async () => {
  const token = await signSession(secret, now)
  expect(await verifySession(token, secret, now)).toBe(true)
  expect(await verifySession(token, secret, now + (SESSION_MAX_AGE_S - 1) * 1000)).toBe(true)
  expect(await verifySession(token, secret, now + (SESSION_MAX_AGE_S + 1) * 1000)).toBe(false)
  expect(SESSION_MAX_AGE_S).toBe(7 * 24 * 3600)
})

test('G-6: tampered, wrong-secret, malformed and empty tokens are rejected', async () => {
  const token = await signSession(secret, now)
  const [v, exp, sig] = token.split('.')
  expect(await verifySession(`${v}.${Number(exp) + 999999}.${sig}`, secret, now)).toBe(false)
  expect(await verifySession(`${v}.${exp}.${sig.slice(0, -2)}AA`, secret, now)).toBe(false)
  expect(await verifySession(token, 'another-secret-0123456789', now)).toBe(false)
  for (const bad of ['', 'x', 'v1..', 'v1.abc.def', undefined, null]) {
    expect(await verifySession(bad as string, secret, now)).toBe(false)
  }
  expect(await verifySession(token, '', now)).toBe(false)
})

test('password compare: exact match only, empty expected never matches', async () => {
  expect(await passwordMatches('cocoa-92', 'cocoa-92')).toBe(true)
  expect(await passwordMatches('cocoa-93', 'cocoa-92')).toBe(false)
  expect(await passwordMatches('cocoa-92 ', 'cocoa-92')).toBe(false)
  expect(await passwordMatches('', 'cocoa-92')).toBe(false)
  expect(await passwordMatches('', '')).toBe(false)
  expect(await passwordMatches('anything', undefined)).toBe(false)
})

test('G-5: only same-site paths are followed after sign-in', () => {
  expect(safeNext('/dashboard?view=collection&id=vegan-creamy')).toBe('/dashboard?view=collection&id=vegan-creamy')
  expect(safeNext('/dashboard/codes')).toBe('/dashboard/codes')
  for (const bad of ['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', '', null, undefined, 'dashboard']) {
    expect(safeNext(bad as string)).toBe('/dashboard')
  }
})

test('G-5b: tabs, newlines and other control characters cannot smuggle in a second slash', () => {
  // The URL parser drops tab and newline, so "/\t/evil.example" would resolve to https://evil.example/.
  for (const bad of ['/\t/evil.example', '/\n/evil.example', '/\r/evil.example', '\t//evil.example', '/\u0000/evil.example', '/\t\\evil.example']) {
    expect(safeNext(bad)).toBe('/dashboard')
  }
})
