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
