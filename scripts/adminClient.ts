// Supabase client for the CLI scripts. Refuses to start unless the env points at the demo project.
import { createClient } from '@supabase/supabase-js'
import { assertDemoProject } from '../lib/demoProject'
import { requireEnv } from './env'

export function adminClient() {
  let ref: string
  try {
    ref = assertDemoProject()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
  const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return { client, ref }
}
