import { NextResponse } from 'next/server'
import { clientAddress, createLimiter } from '@/lib/rateLimit'
import { SESSION_COOKIE, SESSION_MAX_AGE_S, gateConfig, passwordMatches, safeNext, signSession } from '@/lib/session'

// Login form target (ADR 0007, decision 1). Plain form POST, so it works without JavaScript.
// Only failed tries count towards the limit: 5 per minute per address.
export const dynamic = 'force-dynamic'
const failures = createLimiter(5, 60_000)

function back(request: Request, error: string, next: string) {
  const url = new URL('/login', request.url)
  url.searchParams.set('error', error)
  url.searchParams.set('next', next)
  return NextResponse.redirect(url, 303)
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const next = safeNext(String(form?.get('next') ?? ''))
  const cfg = gateConfig()
  if (!cfg) return back(request, 'config', next)

  const password = String(form?.get('password') ?? '')
  if (await passwordMatches(password, cfg.password)) {
    const res = NextResponse.redirect(new URL(next, request.url), 303)
    res.cookies.set(SESSION_COOKIE, await signSession(cfg.secret), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_S,
    })
    return res
  }
  return back(request, failures.allow(clientAddress(request.headers)) ? 'wrong' : 'limit', next)
}
