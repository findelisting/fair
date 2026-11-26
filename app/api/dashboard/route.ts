import { NextResponse } from 'next/server'
import { checkApiParams } from '@/lib/dashboard'
import { getDashboard } from '@/lib/dashboardData'
import { clientAddress, createLimiter } from '@/lib/rateLimit'

// Dashboard numbers, polled every 5 s (ADR 0007, decision 3). Behind the gate (proxy.ts).
export const dynamic = 'force-dynamic'
const limiter = createLimiter(120, 60_000)
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  if (!limiter.allow(clientAddress(request.headers))) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429, headers: NO_STORE })
  }
  const checked = checkApiParams(new URL(request.url).searchParams)
  if (!checked.ok) return NextResponse.json({ error: 'bad parameters' }, { status: 400, headers: NO_STORE })
  try {
    return NextResponse.json(await getDashboard(checked.params), { headers: NO_STORE })
  } catch (e) {
    console.error(`[dashboard] reason=db: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`)
    return NextResponse.json({ error: 'data not available' }, { status: 503, headers: NO_STORE })
  }
}
