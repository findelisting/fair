import Link from 'next/link'
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
    <main id="main" className="flex min-h-[calc(100dvh-36px)] items-start justify-center bg-night [--focus-ring:var(--color-gold)] px-5 py-16 md:items-center">
      <div className="rise-in flex w-full max-w-sm flex-col gap-6">
        <div className="text-ivory">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Finde × fairafric</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Demo dashboard</h1>
          <p className="mt-2 text-sm text-mist">Enter the demo password you were given.</p>
        </div>
        <form method="post" action="/api/login" className="flex flex-col gap-3 rounded-3xl bg-surface p-6 shadow-2xl shadow-black/30">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="password" className="text-sm font-semibold">
            Demo password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? "login-error" : undefined}
            className="min-h-12 rounded-xl border border-line bg-canvas px-4 py-2 text-base focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30"
          />
          {message && (
            <p id="login-error" role="alert" className="text-sm font-medium text-red-700">
              {message}
            </p>
          )}
          <button
            type="submit"
            className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-green px-5 py-2 font-semibold text-white transition-colors hover:bg-green-deep"
          >
            <Lock aria-hidden className="h-4 w-4" /> Sign in
          </button>
        </form>
        <Link href="/" className="text-center text-sm text-mist underline-offset-4 hover:text-ivory hover:underline">
          Back to the demo guide
        </Link>
      </div>
    </main>
  )
}
