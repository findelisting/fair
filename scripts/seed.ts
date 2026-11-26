// npm run seed: upserts the demo catalogue. Deletes nothing (use npm run reset for a clean start).
import './env'
import { adminClient } from './adminClient'
import { seedPayload, validateSeed } from './seedData'

async function main() {
  const problems = validateSeed(seedPayload)
  if (problems.length) {
    console.error('Seed data is invalid:\n- ' + problems.join('\n- '))
    process.exitCode = 1
    return
  }
  const { client, ref } = adminClient()
  const { error } = await client.rpc('seed_demo', { payload: seedPayload })
  if (error) {
    console.error(`Seed failed on project ${ref}: ${error.message}`)
    process.exitCode = 1
    return
  }
  console.log(
    `Seeded project ${ref}: ${seedPayload.skus.length} SKUs, ${seedPayload.collections.length} collection, ` +
      `${seedPayload.markets.length} markets, ${seedPayload.campaigns.length} campaigns, ${seedPayload.codes.length} codes.`,
  )
}

main()
