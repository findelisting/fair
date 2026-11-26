import { Lock } from 'lucide-react'
import { gateConfig, safeNext } from '@/lib/session'

// Branded sign-in for the dashboard (ADR 0007, decision 1). One shared demo password, no user accounts.
export const dynamic = 'force-dynamic'

const MESSAGES: Record<string, string> = {
  wrong: 'That password did not work.',
  limit: 'Too many tries. Wait a minute.',
  config: 'Dashboard not configured.',
}

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const next = safeNext(one(sp.next))
  const error = gateConfig() ? one(sp.error) : 'config'
  const message = error ? MESSAGES[error] : undefined

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-green">Finde × fairafric</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Demo dashboard</h1>
        <p className="mt-2 text-sm text-ink-secondary">Enter the demo password you were given.</p>
      </div>
      <form method="post" action="/api/login" className="flex flex-col gap-3 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="password" className="text-sm font-medium">
          Demo password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-line bg-canvas px-3 py-2 text-base"
        />
        {message && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {message}
          </p>
        )}
        <button
          type="submit"
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green px-4 py-2 font-semibold text-white hover:bg-green-deep"
        >
          <Lock aria-hidden className="h-4 w-4" /> Sign in
        </button>
      </form>
    </main>
  )
}
