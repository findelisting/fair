import { Bot } from 'lucide-react'
import { QUESTIONS, isQuestionId, type AgentAnswer, type QuestionId } from '@/lib/agent'
import { getAnswer } from '@/lib/agentData'
import { cn } from '@/lib/utils'
import { SourceList } from './SourceList'

// Product agent panel (ADR 0006). Server Component: questions are links, the answer renders on the
// server, so it works without JavaScript. The host page (the slice 4 dashboard) builds the links,
// so its own filters stay in the URL.

interface Props {
  /** The `ask` search parameter. Anything that is not a question ID shows no answer. */
  ask?: string | string[]
  hrefFor: (id: QuestionId) => string
}

export async function AgentPanel({ ask, hrefFor }: Props) {
  const id = typeof ask === 'string' && isQuestionId(ask) ? ask : null
  let answer: AgentAnswer | null = null
  let failed = false
  if (id) {
    try {
      answer = await getAnswer(id)
    } catch (e) {
      failed = true
      console.error(`[agent] q=${id} reason=error: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`)
    }
  }

  return (
    <section data-testid="agent-panel" className="flex flex-col gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
      <header className="flex items-center gap-2">
        <Bot aria-hidden className="h-5 w-5 text-green" />
        <h2 className="font-display text-lg font-bold">Ask the product agent</h2>
      </header>
      <ul className="flex flex-col gap-2">
        {QUESTIONS.map((q) => (
          <li key={q.id}>
            <a
              href={hrefFor(q.id)}
              aria-current={q.id === id ? 'true' : undefined}
              className={cn(
                'flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-inset',
                q.id === id ? 'bg-green text-ivory ring-green' : 'bg-canvas text-ink ring-line',
              )}
            >
              {q.question}
            </a>
          </li>
        ))}
      </ul>

      {id && (
        <div data-testid="agent-answer" className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink-secondary">{QUESTIONS.find((q) => q.id === id)!.question}</h3>
          <p data-testid="agent-answer-text" className="text-base">
            {failed ? 'The answer is not available right now. Please try again in a moment.' : answer?.answer}
          </p>
          {answer && <SourceList sources={answer.sources} />}
        </div>
      )}
    </section>
  )
}
