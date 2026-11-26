// Loads .env.local (and friends) the same way Next.js does, for the CLI scripts.
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error })

export function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`Missing ${name}. Add it to .env.local (see .env.example).`)
    process.exit(1)
  }
  return v
}
