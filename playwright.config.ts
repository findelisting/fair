import { defineConfig } from '@playwright/test'

// End-to-end tests against a running app. Starts `next dev` on port 3100 unless E2E_BASE_URL is set
// (for example, to test the deployed demo).
const port = 3100
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  reporter: [['list']],
  timeout: 60_000,
  use: { baseURL },
  // Deletes every scan tagged x-e2e, so test data never reaches the demo dashboard (ADR 0002, decision 10).
  globalTeardown: './tests/e2e/global-teardown.ts',
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
