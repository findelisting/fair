import { expect, test } from '@playwright/test'
import { DATA_SOURCES, NOT_CONNECTED_LABEL, PILOT_NOTE } from '../../lib/dataSources'

// ADR 0009: data sources panel. Static list; nothing is connected in the demo.

test('DS-1: connected sources are exactly what the demo uses, with honest labels', () => {
  const connected = DATA_SOURCES.filter((s) => s.status !== 'available').map((s) => [s.id, s.status])
  expect(connected).toEqual([
    ['qr-scans', 'live'],
    ['feedback', 'live'],
    ['web-analytics', 'synthetic'],
  ])
})

test('DS-2: every available source has a name, what it adds, and the not-connected label', () => {
  const available = DATA_SOURCES.filter((s) => s.status === 'available')
  expect(available.length).toBeGreaterThanOrEqual(4)
  for (const s of available) {
    expect(s.name.trim(), s.id).not.toBe('')
    expect(s.adds.trim(), s.id).not.toBe('')
  }
  expect(NOT_CONNECTED_LABEL).toMatch(/not connected/i)
  expect(PILOT_NOTE).toMatch(/not connected in this demo/i)
  expect(PILOT_NOTE).toMatch(/read-only/i)
})

test('DS-3: ids are unique', () => {
  const ids = DATA_SOURCES.map((s) => s.id)
  expect(new Set(ids).size).toBe(ids.length)
})

test('DS-4: no source brings customer identities or contact details', () => {
  const text = DATA_SOURCES.map((s) => `${s.name} ${s.adds}`).join(' ')
  expect(text).not.toMatch(/\b(emails?|e-mail|names|phone|addresses|customer list|ip)\b/i)
})
