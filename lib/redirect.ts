// QR redirect logic: record the scan first, then redirect (ADR 0002).
// Kept out of the route file and built from injected dependencies, following the Finde
// frontend's lib/shortLinkRedirect.ts, so every branch can be tested with fakes.
// Spec: docs/specs/slice-2-qr-redirect.md section 3.

import type { CodeTarget } from './catalog'
import { clientAddress, type Limiter } from './rateLimit'
import { deviceType, isBot, language, type DeviceType } from './ua'

export type { CodeTarget } from './catalog'

export interface ScanInput {
  code: string
  record: boolean
  device: DeviceType
  language: string | null
  isBot: boolean
}

type Env = Record<string, string | undefined>

export interface RedirectDeps {
  /** One database round trip: look up the code, record the scan if wanted, return the target (null if unknown). */
  recordScan(input: ScanInput, signal: AbortSignal): Promise<CodeTarget | null>
  /** Static lookup used when the database fails or is slow. */
  fallback(slug: string): CodeTarget | null
  /** Runs work after the response is sent (Next.js after()). */
  schedule(task: () => Promise<unknown>): void
  limiter: Limiter
  /** Canonical origin, used in production instead of the request's Host. */
  siteUrl?: string
  env?: Env
  log?(message: string): void
  /** How long the phone waits for the database. */
  budgetMs?: number
  /** When a still-running database call is aborted. */
  hardLimitMs?: number
}

export type ScanOutcome =
  | 'recorded' | 'bot' | 'head' | 'rate-limited' | 'fallback' | 'late' | 'invalid' | 'unknown' | 'inactive'

export const BUDGET_MS = 800
export const HARD_LIMIT_MS = 5_000
const SLUG = /^[a-z0-9-]{3,32}$/
const INACTIVE_PATH = '/code-inactive'

/** Production: the canonical site origin, never the Host header. Elsewhere: the request's own origin. */
export function redirectOrigin(requestUrl: string, siteUrl: string | undefined, env: Env): string {
  if (env.VERCEL_ENV === 'production' && siteUrl) return new URL(siteUrl).origin
  return new URL(requestUrl).origin
}

/** Target path built only from stored data. The incoming query string is never used. */
export function targetPath(t: CodeTarget): string {
  const p = new URLSearchParams()
  if (t.target_type === 'collection') {
    p.set('collection', t.collection_id ?? '')
    p.set('campaign', t.campaign_id)
    p.set('market', t.market)
    return `/c/${encodeURIComponent(t.collection_id ?? '')}?${p}`
  }
  p.set('sku', t.sku_id ?? '')
  p.set('campaign', t.campaign_id)
  p.set('market', t.market)
  if (t.target_type === 'shop') p.set('intent', 'shop')
  const base = t.target_type === 'feedback' ? '/f' : '/p'
  return `${base}/${encodeURIComponent(t.sku_id ?? '')}?${p}`
}

export function createRedirectHandler(deps: RedirectDeps) {
  const env = deps.env ?? process.env
  const log = deps.log ?? ((m: string) => console.error(m))
  const budgetMs = deps.budgetMs ?? BUDGET_MS
  const hardLimitMs = deps.hardLimitMs ?? HARD_LIMIT_MS

  return async function handle(request: Request, method: 'GET' | 'HEAD', rawCode: string): Promise<Response> {
    const origin = redirectOrigin(request.url, deps.siteUrl, env)
    const respond = (path: string, outcome: ScanOutcome) =>
      new Response(null, {
        status: 302,
        headers: { Location: new URL(path, origin).toString(), 'Cache-Control': 'no-store', 'X-Finde-Scan': outcome },
      })

    const slug = (rawCode ?? '').toLowerCase()
    if (!SLUG.test(slug)) return respond(INACTIVE_PATH, 'invalid')

    const ua = request.headers.get('user-agent')
    const bot = isBot(ua)
    let record = method === 'GET'
    let outcome: ScanOutcome
    if (method === 'HEAD') outcome = 'head'
    else if (!deps.limiter.allow(clientAddress(request.headers))) {
      record = false
      outcome = 'rate-limited'
    } else outcome = bot ? 'bot' : 'recorded'

    const input: ScanInput = {
      code: slug,
      record,
      device: deviceType(ua),
      language: language(request.headers.get('accept-language')),
      isBot: bot,
    }

    const started = Date.now()
    const abort = new AbortController()
    const hardTimer = setTimeout(() => abort.abort(), hardLimitMs)
    const call = deps.recordScan(input, abort.signal).finally(() => clearTimeout(hardTimer))

    let budgetTimer: ReturnType<typeof setTimeout> | undefined
    const settled = await Promise.race([
      call.then(
        (target) => ({ kind: 'ok' as const, target }),
        (error: unknown) => ({ kind: 'error' as const, error }),
      ),
      new Promise<{ kind: 'late' }>((resolve) => {
        budgetTimer = setTimeout(() => resolve({ kind: 'late' }), budgetMs)
      }),
    ])
    clearTimeout(budgetTimer)

    const fromFallback = (why: 'fallback' | 'late'): Response => {
      const t = deps.fallback(slug)
      if (!t) return respond(INACTIVE_PATH, 'unknown')
      if (t.status !== 'active') return respond(INACTIVE_PATH, 'inactive')
      return respond(targetPath(t), why)
    }

    if (settled.kind === 'late') {
      log(`[r] slug=${slug} reason=late budget_ms=${budgetMs}; write handed to after()`)
      deps.schedule(() =>
        call.then(
          () => log(`[r] slug=${slug} late write finished ms=${Date.now() - started}`),
          (e: unknown) => log(`[r] slug=${slug} late write failed ms=${Date.now() - started}: ${errorText(e)}`),
        ),
      )
      return fromFallback('late')
    }

    if (settled.kind === 'error') {
      log(`[r] slug=${slug} reason=error ms=${Date.now() - started}: ${errorText(settled.error)}`)
      return fromFallback('fallback')
    }

    const target = settled.target
    if (!target) return respond(INACTIVE_PATH, 'unknown')
    if (target.status !== 'active') return respond(INACTIVE_PATH, 'inactive')
    return respond(targetPath(target), outcome)
  }
}

/** Short error text for logs. Database errors carry no request data, but cap the length anyway. */
function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.slice(0, 200)
}
