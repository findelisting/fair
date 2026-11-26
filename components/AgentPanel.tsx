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
    <section data-testid="agent-panel" className="flex flex-col gap-4 rounded-2xl bg-night p-5 text-ivory [--focus-ring:var(--color-gold)] md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Bot aria-hidden className="h-5 w-5 text-gold" />
          Ask the product agent
        </h2>
        <p className="text-xs text-mist">Answers are counted from the data, with sources. No external AI.</p>
      </header>
      <ul className="grid gap-2 md:grid-cols-2">
        {QUESTIONS.map((q) => (
          <li key={q.id}>
            <a
              href={hrefFor(q.id)}
              aria-current={q.id === id ? 'true' : undefined}
              className={cn(
                'flex h-full min-h-12 items-center rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors',
                q.id === id ? 'bg-gold text-night ring-gold' : 'bg-night-raised text-ivory ring-white/10 hover:ring-gold/60',
              )}
            >
              {q.question}
            </a>
          </li>
        ))}
      </ul>

      {id && (
        <div data-testid="agent-answer" className="rise-in flex flex-col gap-2 rounded-xl bg-surface p-5 text-ink">
          <h3 className="text-sm font-semibold text-ink-secondary">{QUESTIONS.find((q) => q.id === id)!.question}</h3>
          <p data-testid="agent-answer-text" className="font-display text-lg font-semibold leading-snug">
            {failed ? 'The answer is not available right now. Please try again in a moment.' : answer?.answer}
          </p>
          {answer && <SourceList sources={answer.sources} />}
        </div>
      )}
    </section>
  )
}
