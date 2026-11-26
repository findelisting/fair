import { expect, test } from '@playwright/test'
import { createLimiter } from '../../lib/rateLimit'

// Spec: docs/specs/slice-2-qr-redirect.md section 7.2

function fakeClock(start = 1_000_000) {
  let t = start
  return { now: () => t, advance: (ms: number) => { t += ms } }
}

test('U-RL-1: 60 calls in one window are allowed', () => {
  const clock = fakeClock()
  const limiter = createLimiter(60, 60_000, clock.now)
  for (let i = 0; i < 60; i++) expect(limiter.allow('a')).toBe(true)
})

test('U-RL-2: the 61st call in the same window is refused', () => {
  const clock = fakeClock()
  const limiter = createLimiter(60, 60_000, clock.now)
  for (let i = 0; i < 60; i++) limiter.allow('a')
  expect(limiter.allow('a')).toBe(false)
})

test('U-RL-3: a new window allows calls again', () => {
  const clock = fakeClock()
  const limiter = createLimiter(60, 60_000, clock.now)
  for (let i = 0; i < 61; i++) limiter.allow('a')
  clock.advance(60_000)
  expect(limiter.allow('a')).toBe(true)
})

test('U-RL-4: addresses are counted separately', () => {
  const clock = fakeClock()
  const limiter = createLimiter(1, 60_000, clock.now)
  expect(limiter.allow('a')).toBe(true)
  expect(limiter.allow('a')).toBe(false)
  expect(limiter.allow('b')).toBe(true)
})

test('U-RL-5: memory stays bounded with many addresses', () => {
  const clock = fakeClock()
  const limiter = createLimiter(60, 60_000, clock.now, 10_000)
  for (let i = 0; i < 10_001; i++) limiter.allow(`addr-${i}`)
  expect(limiter.size()).toBeLessThanOrEqual(10_000)
  expect(limiter.allow('fresh')).toBe(true)
})
