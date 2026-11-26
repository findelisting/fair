// QR sheet logic (slice 8, ADR 0004, spec docs/specs/slice-8-qr-sheet.md). No JSX, so it is unit-testable.
import QRCode from 'qrcode'
import { seedPayload } from './catalog'

export type BaseUrlStatus = 'ok' | 'test' | 'invalid'

/** Q-6: only a real https address is print-ready. */
export function checkBaseUrl(base: string | undefined): BaseUrlStatus {
  if (!base) return 'invalid'
  let url: URL
  try {
    url = new URL(base)
  } catch {
    return 'invalid'
  }
  const host = url.hostname
  if (url.protocol !== 'https:') return 'test'
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) return 'test'
  return 'ok'
}

/** Q-2: the exact text inside each code. */
export function codeUrl(base: string, code: string): string {
  return `${base.replace(/\/+$/, '')}/r/${encodeURIComponent(code)}`
}

/** Q-3: inline SVG, level H, 4-module quiet zone, black on white. */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 4,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

/** Max share of the code's width the logo pad may take (Q-4). */
export const LOGO_MAX_RATIO = 0.2

/**
 * Q-4: puts a white rounded pad in the centre of the code, with the logo (or a placeholder) on it.
 * Done inside the SVG, so print and screenshots show exactly what a phone sees.
 */
export function withLogo(svg: string, logoHref: string | null, ratio = LOGO_MAX_RATIO): string {
  const m = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/)
  if (!m) return svg
  const n = Number(m[1])
  const size = n * Math.min(ratio, LOGO_MAX_RATIO)
  const at = (n - size) / 2
  const inner = size * 0.84
  const innerAt = (n - inner) / 2
  const mark = logoHref
    ? `<image href="${logoHref}" x="${innerAt}" y="${innerAt}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${n / 2}" y="${n / 2}" font-family="sans-serif" font-size="${size / 4}" text-anchor="middle" dominant-baseline="central" fill="#6b6b6b">Logo</text>`
  const pad = `<g data-logo="${logoHref ? 'brand' : 'placeholder'}"><rect x="${at}" y="${at}" width="${size}" height="${size}" rx="${size / 6}" fill="#ffffff"/>${mark}</g>`
  return svg.replace(/<\/svg>\s*$/, `${pad}</svg>`)
}

export interface SheetCard {
  code: string
  url: string
  label: string
  campaign: string
  market: string
  active: boolean
  svg: string
}

/** Q-1: one card per catalogue code, in catalogue order. */
export async function buildSheet(base: string, logoHref: string | null = null): Promise<SheetCard[]> {
  const campaigns = new Map(seedPayload.campaigns.map((c) => [c.id, c.name]))
  const markets = new Map(seedPayload.markets.map((m) => [m.code, m.name]))
  return Promise.all(
    seedPayload.codes.map(async (c) => {
      const url = codeUrl(base, c.id)
      return {
        code: c.id,
        url,
        label: c.label,
        campaign: campaigns.get(c.campaign_id) ?? c.campaign_id,
        market: markets.get(c.market) ?? c.market,
        active: c.status === 'active',
        svg: withLogo(await qrSvg(url), logoHref),
      }
    }),
  )
}
