import { defineConfig, devices } from '@playwright/test'

// End-to-end and browser tests against a running app.
//
// - Project "e2e": HTTP-level tests in tests/e2e (no browser needed).
// - Project "browser": Chromium tests in tests/browser (pages and the feedback form, JavaScript on and off).
//
// Two dev servers start unless E2E_BASE_URL is set (for example, to test the deployed demo):
// - port 3100: the normal app against the demo database;
// - port 3101: the same app with an unreachable database, for the "database down" tests (ADR 0003, B-FB-7).
//   It builds into its own folder (NEXT_DIST_DIR) so the two servers never share .next.
//
// NEVER run these tests during a live demo: the teardown deletes page views created since the run
// started, which would include real ones (ADR 0003, decision 11).
const port = 3100
const downPort = 3101
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  reporter: [['list']],
  timeout: 90_000,
  // Writes that run after the response (page views) and Server Action redirects can take a few seconds
  // when the whole suite loads the dev servers; 15 s keeps assertions stable without hiding real failures.
  expect: { timeout: 15_000 },
  use: { baseURL },
  globalSetup: './tests/e2e/global-setup.ts',
  // Deletes test scans, test feedback and test page views (ADR 0002 decision 10, ADR 0003 decision 11).
  globalTeardown: './tests/e2e/global-teardown.ts',
  projects: [
    { name: 'e2e', testDir: './tests/e2e', testIgnore: /agent\.spec\.ts/ },
    // The agent's live-scan test (E-AG-6) scans d92-at like the redirect tests do, so it runs after them.
    { name: 'agent', testDir: './tests/e2e', testMatch: /agent\.spec\.ts/, dependencies: ['e2e'] },
    // Runs last, so browser tests never compete with the redirect timing test (E-RD-7) for the dev server.
    { name: 'browser', testDir: './tests/browser', use: { ...devices['Desktop Chrome'], baseURL }, dependencies: ['agent'] },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: `npx next dev -p ${port}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
        {
          command: `npx next dev -p ${downPort}`,
          url: `http://localhost:${downPort}/code-inactive`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: { SUPABASE_URL: 'https://unreachable.invalid', NEXT_DIST_DIR: '.next-db-down' },
        },
      ],
})
