import { notFound } from 'next/navigation'
import { isQuestionId } from '@/lib/agent'
import { getAnswer } from '@/lib/agentData'

// Product agent API (ADR 0006): GET /api/agent?q=<question id>.
// Dev-only until slice 4's demo password gate covers /api/agent (handover in the slice 6 spec).
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') notFound()
  const q = new URL(request.url).searchParams.get('q')
  if (!isQuestionId(q)) return Response.json({ error: 'unknown question' }, { status: 400, headers: NO_STORE })
  try {
    return Response.json(await getAnswer(q), { headers: NO_STORE })
  } catch (e) {
    console.error(`[agent] q=${q} reason=error: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`)
    return Response.json({ error: 'answer unavailable' }, { status: 503, headers: NO_STORE })
  }
}
