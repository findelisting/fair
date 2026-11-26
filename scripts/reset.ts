// npm run reset: deletes ALL demo data (live scans and live feedback included) and seeds again.
// Runs as one database function call, so a failure leaves the old data in place.
// Refuses to run unless SUPABASE_URL points at DEMO_SUPABASE_PROJECT_ID.
import './env'
import { adminClient } from './adminClient'
import { seedPayload, validateSeed } from './seedData'
import { loadSynthetic } from './synthetic'

async function main() {
  const problems = validateSeed(seedPayload)
  if (problems.length) {
    console.error('Seed data is invalid, nothing was deleted:\n- ' + problems.join('\n- '))
    process.exitCode = 1
    return
  }
  const { client, ref } = adminClient()
  console.log(`Resetting demo project ${ref} ...`)
  const { error } = await client.rpc('reset_demo', { payload: seedPayload })
  if (error) {
    console.error(`Reset failed, old data kept: ${error.message}`)
    process.exitCode = 1
    return
  }

  if (!(await loadSynthetic(client))) process.exitCode = 1

  const counts: string[] = []
  for (const table of ['skus', 'collections', 'markets', 'campaigns', 'codes', 'scan_events', 'feedback']) {
    const { count, error: countError } = await client.from(table).select('*', { count: 'exact', head: true })
    counts.push(`${table}=${countError ? 'error' : count}`)
  }
  console.log(`Reset done. ${counts.join(', ')}`)
}

main()
