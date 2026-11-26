// npm run check:rls: proves the public (publishable/anon) key can read and write nothing.
// Exits non-zero if any table returns rows, accepts an insert, or a reset function can be called.
import './env'
import { createClient } from '@supabase/supabase-js'
import { assertDemoProject } from '../lib/demoProject'
import { requireEnv } from './env'

const TABLES = [
  'markets', 'collections', 'skus', 'collection_skus', 'campaigns', 'codes',
  'scan_events', 'page_views', 'feedback', 'web_aggregates',
]

async function main() {
  try {
    assertDemoProject()
  } catch (e) {
    console.error((e as Error).message)
    process.exitCode = 1
    return
  }
  const publicClient = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let leaks = 0
  for (const table of TABLES) {
    const { data, error } = await publicClient.from(table).select('*').limit(1)
    const rows = data?.length ?? 0
    if (rows > 0) leaks++
    console.log(`read  ${table.padEnd(16)} ${rows > 0 ? 'LEAK: rows returned' : `blocked (${error ? error.code ?? 'error' : '0 rows'})`}`)
  }

  const insert = await publicClient.from('feedback').insert({ sku_id: 'dark-92', rating: 5, taste_note: 'rls-check' })
  if (!insert.error) leaks++
  console.log(`write feedback         ${insert.error ? `blocked (${insert.error.code ?? 'error'})` : 'LEAK: insert accepted'}`)

  for (const fn of ['reset_demo', 'seed_demo']) {
    const { error } = await publicClient.rpc(fn, { payload: {} })
    if (!error) leaks++
    console.log(`call  ${fn.padEnd(16)} ${error ? `blocked (${error.code ?? 'error'})` : 'LEAK: call accepted'}`)
  }

  if (leaks) {
    console.error(`\n${leaks} leak(s) found. The public key must not reach the data.`)
    process.exitCode = 1
    return
  }
  console.log('\nOK: the public key can read and write nothing.')
}

main()
