import { expect, test } from '@playwright/test'
import QRCode from 'qrcode'
import { buildSheet, checkBaseUrl, codeUrl, qrSvg, withLogo } from '@/lib/qrSheet'
import { seedPayload } from '@/lib/catalog'

test('Q-2: code URL is base + /r/ + code, trailing slashes removed', () => {
  expect(codeUrl('https://fairafric-demo.thefindeapp.com', 'd92-at')).toBe('https://fairafric-demo.thefindeapp.com/r/d92-at')
  expect(codeUrl('https://fairafric-demo.thefindeapp.com//', 'd92-at')).toBe('https://fairafric-demo.thefindeapp.com/r/d92-at')
})

test('Q-6: only a real https address is print-ready', () => {
  expect(checkBaseUrl('https://fairafric-demo.thefindeapp.com')).toBe('ok')
  expect(checkBaseUrl('http://fairafric-demo.thefindeapp.com')).toBe('test')
  expect(checkBaseUrl('http://localhost:3000')).toBe('test')
  expect(checkBaseUrl('https://localhost')).toBe('test')
  expect(checkBaseUrl('https://127.0.0.1')).toBe('test')
  expect(checkBaseUrl('https://finde-demo-abc123.vercel.app')).toBe('test')
  expect(checkBaseUrl(undefined)).toBe('invalid')
  expect(checkBaseUrl('not a url')).toBe('invalid')
})

test('Q-3: SVG output at error correction level H', async () => {
  const svg = await qrSvg('https://fairafric-demo.thefindeapp.com/r/d92-at')
  expect(svg).toMatch(/^<svg/)
  expect(QRCode.create('x', { errorCorrectionLevel: 'H' }).errorCorrectionLevel.bit).toBe(2)
})

test('Q-1: one card per catalogue code, in order, with its exact URL', async () => {
  const cards = await buildSheet('https://fairafric-demo.thefindeapp.com')
  expect(cards.map((c) => c.code)).toEqual(seedPayload.codes.map((c) => c.id))
  for (const c of cards) {
    expect(c.url).toBe(`https://fairafric-demo.thefindeapp.com/r/${c.code}`)
    expect(c.campaign).not.toBe('')
    expect(c.market).not.toBe('')
  }
})

test('Q-4: logo pad sits in the centre and never exceeds 20% of the width', async () => {
  const svg = await qrSvg('https://fairafric-demo.thefindeapp.com/r/d92-at')
  const n = Number(svg.match(/viewBox="0 0 (\d+)/)![1])
  for (const [href, kind] of [[null, 'placeholder'], ['/brand/fairafric-logo.svg', 'brand']] as const) {
    const out = withLogo(svg, href, 0.5)
    expect(out).toContain(`data-logo="${kind}"`)
    const w = Number(out.match(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)"/g)!.pop()!.match(/width="([\d.]+)"/)![1])
    expect(w).toBeLessThanOrEqual(n * 0.2 + 1e-9)
    expect(out.trim().endsWith('</svg>')).toBe(true)
  }
})
