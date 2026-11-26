import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only Supabase client with the secret (service-role) key.
// The `server-only` import makes the build fail if a client component imports this file,
// so the key can never reach the browser. Every table has RLS on with no policies,
// so this client is the only way to the data (APPROACH.md section 3).

let client: SupabaseClient | null = null

export function supabaseServer(): SupabaseClient {
  if (client) return client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
