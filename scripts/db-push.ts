// npm run db:push: applies supabase/migrations to the demo project with the Supabase CLI.
// Refuses to run unless both SUPABASE_URL and SUPABASE_DB_URL belong to DEMO_SUPABASE_PROJECT_ID.
//
// Safety details:
// - The CLI is started with node directly (no shell), so special characters in the
//   database password (& @ % ^ and so on) are never interpreted by cmd.exe.
// - The password is URL-encoded, so a raw '@' or ':' in it cannot break the connection string.
// - Everything the CLI prints is scrubbed of the password before it reaches the terminal.
import './env'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { assertDemoProject, dbUrlMatchesProject, normalizeDbUrl } from '../lib/demoProject'
import { requireEnv } from './env'

let ref: string
try {
  ref = assertDemoProject()
} catch (e) {
  console.error((e as Error).message)
  process.exit(1)
}

const normalized = normalizeDbUrl(requireEnv('SUPABASE_DB_URL'))
if (!normalized || !dbUrlMatchesProject(normalized.url, ref)) {
  console.error(`Refusing to run: SUPABASE_DB_URL is not a valid connection string for the demo project "${ref}".`)
  process.exit(1)
}
const { url: dbUrl, password } = normalized

const secrets = [password, encodeURIComponent(password)].filter((s) => s.length > 0)
const scrub = (text: string) => secrets.reduce((t, s) => t.split(s).join('****'), text)

const cli = path.join(process.cwd(), 'node_modules', 'supabase', 'dist', 'supabase.js')

console.log(`Applying migrations to demo project ${ref} ...`)
const child = spawn(process.execPath, [cli, 'db', 'push', '--db-url', dbUrl, '--include-all', '--yes'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
})
child.stdout.on('data', (d) => process.stdout.write(scrub(String(d))))
child.stderr.on('data', (d) => process.stderr.write(scrub(String(d))))
child.on('close', (code) => process.exit(code ?? 1))
