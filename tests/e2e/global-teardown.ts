import { deleteTestFeedback, deleteTestPageViews, deleteTestScans } from './support/db'

// Removes everything the tests created, so test data never reaches the demo dashboard:
// - scans tagged x-e2e (ADR 0002, decision 10);
// - feedback whose free text starts with [e2e] (ADR 0003, decision 11);
// - page views created since the run started (ADR 0003, decision 11). Never run tests during a live demo.
export default async function globalTeardown() {
  const scans = await deleteTestScans()
  const feedback = await deleteTestFeedback()
  const since = process.env.E2E_RUN_STARTED_AT
  const views = since ? await deleteTestPageViews(since) : 0
  console.log(`[teardown] removed ${scans} test scan(s), ${feedback} test answer(s), ${views} page view(s)`)
}
