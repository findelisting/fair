import { NextResponse } from 'next/server'
import { INSIGHT_CARD_IDS } from '@/lib/dashboard'
import { recordInsightCheck } from '@/lib/dashboardData'
import { clientAddress, createLimiter } from '@/lib/rateLimit'

// "Useful and accurate?" answers (ADR 0007, decision 5). Behind the gate. Stores card id, answer and time only.
export const dynamic = 'force-dynamic'
const limiter = createLimiter(30, 60_000)

export async function POST(request: Request) {
  if (!limiter.allow(clientAddress(request.headers))) return NextResponse.json({ error: 'too many requests' }, { status: 429 })
  const body = (await request.json().catch(() => null)) as { cardId?: unknown; answer?: unknown } | null
  const cardId = typeof body?.cardId === 'string' ? body.cardId : ''
  const answer = body?.answer
  if (!INSIGHT_CARD_IDS.has(cardId) || (answer !== 'up' && answer !== 'down')) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  try {
    await recordInsightCheck(cardId, answer)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error(`[insight-check] reason=db: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`)
    return NextResponse.json({ error: 'not saved' }, { status: 503 })
  }
}
