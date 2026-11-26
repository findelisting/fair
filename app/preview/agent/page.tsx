import { notFound } from 'next/navigation'
import { AgentPanel } from '@/components/AgentPanel'
import type { QuestionId } from '@/lib/agent'

// Temporary, dev-only preview of the product agent panel (ADR 0006).
// Slice 4 embeds AgentPanel in the dashboard and deletes this page.
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AgentPreview({ searchParams }: Props) {
  if (process.env.NODE_ENV === 'production') notFound()
  const sp = await searchParams

  // Keep every other parameter (as the dashboard keeps its filters) and set `ask`.
  const hrefFor = (id: QuestionId) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (k !== 'ask' && typeof v === 'string') q.set(k, v)
    q.set('ask', id)
    return `/preview/agent?${q}`
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-green">Preview (dev only)</p>
      <AgentPanel ask={sp.ask} hrefFor={hrefFor} />
    </main>
  )
}
