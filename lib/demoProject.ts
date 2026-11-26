// Guards that stop scripts from touching the wrong Supabase project.
// Plain module (no `server-only`), so the scripts and the unit tests can import it.

const SUPABASE_URL = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/

/** The project ref in a Supabase URL, or null when the URL is not a Supabase project URL. */
export function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null
  const m = url.trim().match(SUPABASE_URL)
  return m ? m[1] : null
}

/** True when a Postgres connection string belongs to the given project (direct or pooler form). */
export function dbUrlMatchesProject(dbUrl: string | undefined, ref: string): boolean {
  if (!dbUrl) return false
  let u: URL
  try {
    u = new URL(dbUrl)
  } catch {
    return false
  }
  if (u.protocol !== 'postgresql:' && u.protocol !== 'postgres:') return false
  const user = decodeURIComponent(u.username)
  // Pooler: user is postgres.<ref>. Direct: host is db.<ref>.supabase.co.
  return user === `postgres.${ref}` || u.hostname === `db.${ref}.supabase.co`
}

/**
 * Rebuilds a Postgres connection string with the password URL-encoded.
 * Supabase shows the string with a raw password, and a raw '@', ':' or '/' in it breaks URL parsing.
 * Splits at the LAST '@' (hosts never contain '@') and the FIRST ':' after the scheme
 * (Supabase user names never contain ':'). Returns null when the shape is wrong.
 */
export function normalizeDbUrl(raw: string): { url: string; password: string } | null {
  const m = raw.trim().match(/^(postgres(?:ql)?:\/\/)(.+)$/)
  if (!m) return null
  const [, scheme, rest] = m
  const at = rest.lastIndexOf('@')
  if (at < 0) return null
  const creds = rest.slice(0, at)
  const hostPart = rest.slice(at + 1)
  const colon = creds.indexOf(':')
  if (colon < 0 || !hostPart) return null
  const user = creds.slice(0, colon)
  let password = creds.slice(colon + 1)
  // If the password was already encoded, decode it first so it is not encoded twice.
  try {
    if (/%[0-9A-Fa-f]{2}/.test(password)) password = decodeURIComponent(password)
  } catch {
    // Not valid percent-encoding: keep it as typed.
  }
  if (!user || !password) return null
  return { url: `${scheme}${user}:${encodeURIComponent(password)}@${hostPart}`, password }
}

type Env = Record<string, string | undefined>

/**
 * Returns the demo project ref. Throws unless SUPABASE_URL is a Supabase project URL
 * and its ref equals DEMO_SUPABASE_PROJECT_ID. Every script that writes calls this first.
 */
export function assertDemoProject(env: Env = process.env): string {
  const ref = projectRefFromUrl(env.SUPABASE_URL)
  if (!ref) throw new Error('SUPABASE_URL is missing or is not a Supabase project URL (https://<ref>.supabase.co).')
  const expected = env.DEMO_SUPABASE_PROJECT_ID?.trim()
  if (!expected) throw new Error('DEMO_SUPABASE_PROJECT_ID is missing.')
  if (ref !== expected) {
    throw new Error(`Refusing to run: SUPABASE_URL points to project "${ref}", but DEMO_SUPABASE_PROJECT_ID is "${expected}".`)
  }
  return ref
}
