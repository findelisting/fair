import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, gateConfig, verifySession } from './lib/session'

// Demo password gate (slice 4, ADR 0007 decision 1). Fails closed: without both env variables nothing gets in.
// Pages go to /login; APIs answer 401. Public pages (/p, /c, /f, /r) are not matched and set no cookie.
export async function proxy(request: NextRequest) {
  const cfg = gateConfig()
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (cfg && (await verifySession(token, cfg.secret))) return NextResponse.next()

  const { pathname, search } = request.nextUrl
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'sign in required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  const login = new URL('/login', request.url)
  login.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(login, 307)
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/api/dashboard/:path*', '/api/agent/:path*', '/api/insight-check/:path*'],
}
