import { expect, test } from '@playwright/test'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { BANNED_CLAIM_WORDS } from '../../lib/insights'

// Slice 10 (ADR 0008, spec docs/specs/slice-10-hardening.md): static checks over the tracked files.

const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean)
const read = (f: string) => readFileSync(f, 'utf8')
const appSource = tracked.filter((f) => /^(app|components|lib)\/.*\.(tsx?|css)$/.test(f))

test('H-5: no video files in the repo', () => {
  expect(tracked.filter((f) => /\.(mp4|mov|webm|m4v|avi|mkv|ogv)$/i.test(f))).toEqual([])
})

test('H-5: no <video> or <iframe> in the app', () => {
  expect(appSource.filter((f) => /<(video|iframe)\b/i.test(read(f)))).toEqual([])
})

test('H-7: no claim words in app text (the banned list itself excepted)', () => {
  const re = new RegExp(`\\b(${BANNED_CLAIM_WORDS.join('|')})\\b`, 'i')
  const hits = appSource
    .filter((f) => f !== 'lib/insights.ts')
    .flatMap((f) => read(f).split('\n').map((l, i) => [f, i + 1, l] as const))
    .filter(([, , l]) => re.test(l))
    .map(([f, n]) => `${f}:${n}`)
  expect(hits).toEqual([])
  // lib/insights.ts: only the list line may hold a claim word.
  const own = read('lib/insights.ts').split('\n').filter((l) => re.test(l) && !l.includes('BANNED_CLAIM_WORDS'))
  expect(own).toEqual([])
})

test('H-6: the schema has no contact or identity columns', () => {
  const sql = tracked.filter((f) => /^supabase\/migrations\/.*\.sql$/.test(f)).map(read).join('\n')
  const cols = [...sql.matchAll(/^\s*([a-z_]+)\s+(text|varchar|inet|citext|uuid|int|bigint|jsonb)\b/gim)].map((m) => m[1].toLowerCase())
  const bad = cols.filter((c) => /(^|_)(email|phone|mobile|ip|ip_address|address|first_name|last_name|full_name|user_id|customer|contact|user_agent)($|_)/.test(c))
  expect(bad).toEqual([])
})

test('H-8: secrets are never referenced from client components', () => {
  const client = appSource.filter((f) => /^\s*['"]use client['"]/m.test(read(f)))
  expect(client.length).toBeGreaterThan(0)
  expect(client.filter((f) => /SERVICE_ROLE|DEMO_DASHBOARD_PASSWORD|DEMO_SESSION_SECRET|SUPABASE_DB_URL/.test(read(f)))).toEqual([])
  expect(appSource.filter((f) => /NEXT_PUBLIC_/.test(read(f)))).toEqual([])
})
