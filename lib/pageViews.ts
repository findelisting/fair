// Page-view rules (ADR 0003, decision 4). Pure, so unit tests can import it.
// The database write lives in lib/recordPageView.ts (server-only).
import { isBot } from './ua'

export type TrackedPage = 'product' | 'feedback' | 'collection'

/** False for bots (slice 2 rules) and for prefetch requests, which are not real visits. */
export function shouldCountView(headers: Headers): boolean {
  if (isBot(headers.get('user-agent'))) return false
  if (headers.get('next-router-prefetch')) return false
  const purpose = `${headers.get('sec-purpose') ?? ''} ${headers.get('purpose') ?? ''}`.toLowerCase()
  if (purpose.includes('prefetch') || purpose.includes('prerender')) return false
  return true
}
