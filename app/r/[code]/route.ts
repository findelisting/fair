import { after } from 'next/server'
import { fallbackCode } from '@/lib/catalog'
import { createLimiter } from '@/lib/rateLimit'
import { recordScan } from '@/lib/recordScan'
import { createRedirectHandler } from '@/lib/redirect'

// QR redirect: record the scan first, then redirect (ADR 0002). All logic is in lib/redirect.ts.
export const dynamic = 'force-dynamic'

// Module scope: one limiter per server instance.
const handle = createRedirectHandler({
  recordScan,
  fallback: fallbackCode,
  schedule: (task) => after(task),
  limiter: createLimiter(),
  siteUrl: process.env.PUBLIC_BASE_URL,
})

type Ctx = { params: Promise<{ code: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const { code } = await params
  return handle(request, 'GET', code)
}

// Defined explicitly so a HEAD request is never answered by GET and never records (ADR 0002, decision 6).
export async function HEAD(request: Request, { params }: Ctx) {
  const { code } = await params
  return handle(request, 'HEAD', code)
}
