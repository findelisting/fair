// Fixed-window counter per address, adapted from the Finde frontend (lib/shortLinkRedirect.ts, createLimiter).
// In memory, so per server instance: it slows a flood, it is not an exact quota.
// The address lives only in this map, for at most one window. It is never stored or logged.

export const LIMIT_PER_MINUTE = 60
export const WINDOW_MS = 60_000
export const MAX_TRACKED = 10_000

export interface Limiter {
  /** true when this request is within the limit. */
  allow(address: string): boolean
  /** Number of tracked addresses (for tests). */
  size(): number
}

export function createLimiter(
  limit = LIMIT_PER_MINUTE,
  windowMs = WINDOW_MS,
  now: () => number = Date.now,
  maxTracked = MAX_TRACKED,
): Limiter {
  const windows = new Map<string, { start: number; count: number }>()
  return {
    allow(address: string): boolean {
      const t = now()
      const w = windows.get(address)
      if (!w || t - w.start >= windowMs) {
        if (!w && windows.size >= maxTracked) {
          for (const [key, value] of windows) if (t - value.start >= windowMs) windows.delete(key)
          if (windows.size >= maxTracked) windows.clear()
        }
        windows.set(address, { start: t, count: 1 })
        return true
      }
      w.count++
      return w.count <= limit
    },
    size: () => windows.size,
  }
}

/** The caller's address for rate limiting only: first x-forwarded-for entry, else x-real-ip, else "unknown". */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded
  return headers.get('x-real-ip')?.trim() || 'unknown'
}
