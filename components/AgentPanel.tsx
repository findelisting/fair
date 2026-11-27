import Link from 'next/link'
import { Package } from 'lucide-react'
import { QUESTIONS, agentStatusLine, isQuestionId, type AgentAnswer, type QuestionId } from '@/lib/agent'
import { getAnswer } from '@/lib/agentData'
import { agentCardId } from '@/lib/dashboard'
import { AnswerStream } from './dashboard/AnswerStream'
import { InsightCheck } from './dashboard/InsightCheck'
import { cn } from '@/lib/utils'
import { QUESTION_EVIDENCE } from '@/lib/evidence'
import { EvidenceTag } from './EvidenceTag'
import { SourceList } from './SourceList'

// Product agent panel (ADR 0006). Server Component: questions are links, the answer renders on the
// server, so it works without JavaScript. The host page (the slice 4 dashboard) builds the links,
// so its own filters stay in the URL.

interface Props {
  /** The `ask` search parameter. Anything that is not a question ID shows no answer. */
  ask?: string | string[]
  hrefFor: (id: QuestionId) => string
  /** Questions to list; the collection view passes only those that span products (ADR 0011). Default: all. */
  questionIds?: readonly QuestionId[]
  /** True when the dashboard has a market or campaign filter, which the fixed questions do not use. */
  filtersActive?: boolean
}

export async function AgentPanel({ ask, hrefFor, questionIds, filtersActive = false }: Props) {
  const listed = QUESTIONS.filter((q) => !questionIds || questionIds.includes(q.id))
  const id = typeof ask === 'string' && isQuestionId(ask) && listed.some((q) => q.id === ask) ? ask : null
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
    <section data-testid="agent-panel" aria-labelledby="agent-title" className="flex flex-col gap-4 rounded-2xl bg-night p-5 text-ivory [--focus-ring:var(--color-gold)] md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="agent-title" className="flex items-center gap-2 font-display text-xl font-bold">
          <Package aria-hidden className="h-5 w-5 text-gold" />
          Product agent
        </h2>
        <p className="max-w-xl text-xs text-mist">
          Works from each product&apos;s memory: every scan, visit and feedback answer, across markets and campaigns. Answers are
          counted from that data, with sources. No external AI; it makes no claims and changes nothing.
        </p>
      </header>
      <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
        {listed.map((q) => (
          <li key={q.id}>
            {/* Client navigation without scrolling: the page keeps its place and the numbers do not restart. */}
            <Link
              href={hrefFor(q.id)}
              scroll={false}
              prefetch={false}
              aria-current={q.id === id ? 'true' : undefined}
              className={cn(
                'flex min-h-11 items-center rounded-full px-4 py-2 text-left text-sm font-medium ring-1 ring-inset transition-colors duration-150',
                q.id === id ? 'bg-gold text-night ring-gold' : 'bg-night-raised text-ivory ring-white/10 hover:ring-gold/60',
              )}
            >
              {q.question}
            </Link>
          </li>
        ))}
      </ul>
      {questionIds && listed.length < QUESTIONS.length && (
        <p className="text-xs text-mist">Questions about a single bar are in the product view.</p>
      )}

      {id && (
        <div data-testid="agent-answer" className="rise-in flex flex-col gap-2 rounded-xl bg-surface p-5 text-ink">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink-secondary">{QUESTIONS.find((q) => q.id === id)!.question}</h3>
            {!failed && <EvidenceTag kind={QUESTION_EVIDENCE[id]} withLabel className="shrink-0" />}
          </div>
          <p data-testid="agent-scope" className="text-xs text-ink-secondary">
            Covers: {QUESTIONS.find((q) => q.id === id)!.scope}
            {filtersActive && <span className="font-semibold"> · The dashboard filters do not apply to this answer.</span>}
          </p>
          {failed || !answer ? (
            <p data-testid="agent-answer-text" className="font-display text-lg font-semibold leading-snug">
              The answer is not available right now. Please try again in a moment.
            </p>
          ) : (
            <AnswerStream key={answer.id} text={answer.answer} status={agentStatusLine(answer)}>
              <SourceList sources={answer.sources} />
              <InsightCheck cardId={agentCardId(answer.id)} prompt="Was this helpful?" className="mt-3" />
            </AnswerStream>
          )}
        </div>
      )}
    </section>
  )
}
