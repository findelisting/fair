import { defineConfig } from '@playwright/test'

// Pure-logic tests: no browser, no server, no database. Same split as the Finde frontend.
export default defineConfig({
  testDir: './tests/unit',
  reporter: [['list']],
})
