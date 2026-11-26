// Service-role database access for end-to-end tests. Refuses to run against anything but the demo project.
import { loadEnvConfig } from '@next/env'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertDemoProject } from '../../../lib/demoProject'

/** Accept-Language value that marks every scan made by a test (ADR 0002, decision 10). */
export const E2E_LANGUAGE = 'x-e2e'

let client: SupabaseClient | null = null

export function testDb(): SupabaseClient {
  if (client) return client
  loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error })
  assertDemoProject()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed for end-to-end tests.')
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}

/** Deletes every scan made by a test. Returns how many rows were removed. */
export async function deleteTestScans(): Promise<number> {
  const { error, count } = await testDb()
    .from('scan_events')
    .delete({ count: 'exact' })
    .eq('language', E2E_LANGUAGE)
  if (error) throw new Error(`Could not delete test scans: ${error.message}`)
  return count ?? 0
}

/** Marker at the start of every test answer's free text (ADR 0003, decision 11). */
export const E2E_FEEDBACK_MARK = '[e2e]'

/** Deletes every test answer. Returns how many rows were removed. */
export async function deleteTestFeedback(): Promise<number> {
  const { error, count } = await testDb()
    .from('feedback')
    .delete({ count: 'exact' })
    // In SQL LIKE only % and _ are special, so the brackets need no escaping.
    .like('free_text', `${E2E_FEEDBACK_MARK}%`)
  if (error) throw new Error(`Could not delete test feedback: ${error.message}`)
  return count ?? 0
}

/** Deletes live page views created since the given time. Never call during a live demo. */
export async function deleteTestPageViews(sinceIso: string): Promise<number> {
  const { error, count } = await testDb()
    .from('page_views')
    .delete({ count: 'exact' })
    .eq('source', 'live')
    .gte('ts', sinceIso)
  if (error) throw new Error(`Could not delete test page views: ${error.message}`)
  return count ?? 0
}
