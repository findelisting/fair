import 'server-only'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { shouldCountView, type TrackedPage } from './pageViews'
import { supabaseServer } from './supabaseServer'

export interface PageViewRow {
  page: TrackedPage
  sku_id?: string | null
  collection_id?: string | null
  campaign_id: string | null
  market: string | null
}

/**
 * Counts a real visit to a product, collection or feedback page (ADR 0003, decision 4).
 * Bots and prefetch requests are skipped. The write runs after the response is sent,
 * so the page never waits, and a failure is only logged (no IP, no user agent).
 */
export async function trackPageView(row: PageViewRow): Promise<void> {
  const h = await headers()
  if (!shouldCountView(h)) return
  after(async () => {
    const started = Date.now()
    try {
      const { error } = await supabaseServer()
        .from('page_views')
        .insert({ sku_id: null, collection_id: null, ...row, source: 'live' })
      if (error) throw new Error(`${error.code ?? ''} ${error.message}`.trim())
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 200)
      console.error(`[pv] page=${row.page} reason=error ms=${Date.now() - started}: ${msg}`)
    }
  })
}
