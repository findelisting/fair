// npm run check:rls: proves the public (publishable/anon) key can read and write nothing.
//
// A check only passes when Postgres itself refuses: error code 42501 (permission denied).
// Any other error (invalid key, network, missing function) proves nothing, so it fails the run
// as "inconclusive". This stops a broken key from looking like a locked-down database.
import './env'
import { createClient } from '@supabase/supabase-js'
import { assertDemoProject } from '../lib/demoProject'
import { requireEnv } from './env'

const TABLES = [
  'markets', 'collections', 'skus', 'collection_skus', 'campaigns', 'codes',
  'scan_events', 'page_views', 'feedback', 'web_aggregates',
]
const PERMISSION_DENIED = '42501'

type Result = 'blocked' | 'leak' | 'inconclusive'

function judge(error: { code?: string; message?: string } | null, gotData: boolean): { result: Result; note: string } {
  if (!error) return gotData ? { result: 'leak', note: 'LEAK: rows returned or call accepted' } : { result: 'leak', note: 'LEAK: no permission error' }
  if (error.code === PERMISSION_DENIED) return { result: 'blocked', note: `blocked (${PERMISSION_DENIED})` }
  return { result: 'inconclusive', note: `INCONCLUSIVE (${error.code ?? 'no code'}: ${(error.message ?? '').slice(0, 60)})` }
}

async function main() {
  try {
    assertDemoProject()
  } catch (e) {
    console.error((e as Error).message)
    process.exitCode = 1
    return
  }
  const url = requireEnv('SUPABASE_URL')
  const key = requireEnv('SUPABASE_PUBLISHABLE_KEY')

  // The key itself must be valid, otherwise every check below would "fail closed" for the wrong reason.
  const probe = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, { headers: { apikey: key } })
  if (probe.status === 401) {
    console.error('SUPABASE_PUBLISHABLE_KEY is rejected by the project ("Invalid API key"). Copy the current publishable key from Project Settings -> API Keys.')
    process.exitCode = 1
    return
  }

  const publicClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const results: Result[] = []
  const report = (label: string, r: { result: Result; note: string }) => {
    results.push(r.result)
    console.log(`${label.padEnd(24)} ${r.note}`)
  }

  for (const table of TABLES) {
    const { data, error } = await publicClient.from(table).select('*').limit(1)
    report(`read  ${table}`, judge(error, (data?.length ?? 0) > 0))
  }

  const insert = await publicClient.from('feedback').insert({ sku_id: 'dark-92', rating: 5, taste_note: 'rls-check' })
  report('write feedback', judge(insert.error, true))

  // Only functions whose call would do no harm even if it got through: seed_demo with an empty
  // payload upserts nothing, and record_scan with p_record = false writes nothing.
  // reset_demo is deliberately NOT called: if its grants were ever wrong, the check itself would
  // wipe the demo. It carries the same revoke/grant statements as seed_demo, which is checked here.
  const calls: [string, Record<string, unknown>][] = [
    ['seed_demo', { payload: {} }],
    ['record_scan', { p_code: 'd92-at', p_record: false, p_device: 'unknown', p_language: null, p_is_bot: true }],
  ]
  for (const [fn, args] of calls) {
    const { error } = await publicClient.rpc(fn, args)
    report(`call  ${fn}`, judge(error, true))
  }

  const leaks = results.filter((r) => r === 'leak').length
  const unclear = results.filter((r) => r === 'inconclusive').length
  if (leaks || unclear) {
    console.error(`\n${leaks} leak(s), ${unclear} inconclusive check(s). Every check must be refused with ${PERMISSION_DENIED}.`)
    process.exitCode = 1
    return
  }
  console.log(`\nOK: all ${results.length} checks refused with permission denied (${PERMISSION_DENIED}).`)
}

main()
