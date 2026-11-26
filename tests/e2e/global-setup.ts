// Records when the test run started, so the teardown can remove the page views this run created
// (ADR 0003, decision 11). Environment variables set here reach the teardown.
export default async function globalSetup() {
  process.env.E2E_RUN_STARTED_AT = new Date(Date.now() - 1_000).toISOString()
}
