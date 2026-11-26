// Demo password gate (slice 4, ADR 0007 decision 1). Web Crypto only, so it runs in the proxy and in route handlers.
// Token: "v1.<expiry in unix seconds>.<base64url HMAC-SHA256 of 'v1.<expiry>'>". No user identity inside.

export const SESSION_COOKIE = 'finde_demo_session'
export const SESSION_MAX_AGE_S = 7 * 24 * 3600

const enc = new TextEncoder()

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Constant-time compare of two equal-length byte arrays. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function signSession(secret: string, nowMs = Date.now()): Promise<string> {
  const payload = `v1.${Math.floor(nowMs / 1000) + SESSION_MAX_AGE_S}`
  return `${payload}.${b64url(await hmac(secret, payload))}`
}

export async function verifySession(token: string | undefined | null, secret: string | undefined, nowMs = Date.now()): Promise<boolean> {
  if (!token || !secret) return false
  const m = /^v1\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token)
  if (!m) return false
  const expected = b64url(await hmac(secret, `v1.${m[1]}`))
  if (!sameBytes(enc.encode(expected), enc.encode(m[2]))) return false
  return Number(m[1]) * 1000 > nowMs
}

/** Constant-time password check: both sides are hashed first, so length and content do not leak. */
export async function passwordMatches(input: string, expected: string | undefined): Promise<boolean> {
  if (!expected || !input) return false
  const key = 'finde-demo-password-compare'
  return sameBytes(await hmac(key, input), await hmac(key, expected))
}

/** Where to go after sign-in: same-site paths only. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/dashboard'
  return next
}

/** Both variables must be set, or the gate stays shut. */
export function gateConfig(): { password: string; secret: string } | null {
  const password = process.env.DEMO_DASHBOARD_PASSWORD
  const secret = process.env.DEMO_SESSION_SECRET
  if (!password || !secret || secret.length < 16) return null
  return { password, secret }
}
