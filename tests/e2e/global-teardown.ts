import { deleteTestScans } from './support/db'

// Removes every scan the tests created, so test data never reaches the demo dashboard (ADR 0002, decision 10).
export default async function globalTeardown() {
  const removed = await deleteTestScans()
  console.log(`[teardown] removed ${removed} test scan(s)`)
}
