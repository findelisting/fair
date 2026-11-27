import { EvidenceTag } from './EvidenceTag'
import { HypothesisLabel } from './HypothesisLabel'
import { IDEAS_EVIDENCE } from '@/lib/evidence'
import { insightsFor } from '@/lib/insights'

/** Improvement suggestions: one light card per idea, labelled, with its data basis (CLAUDE.md scope item 10, ADR 0012). */
export function HypothesesPanel({ sku }: { sku?: string }) {
  const { hypotheses } = insightsFor(sku)
  if (hypotheses.length === 0) return null
  return (
    <section data-testid="hypotheses-panel" aria-labelledby="hypotheses-title" className="flex flex-col gap-3">
      <h3 id="hypotheses-title" className="flex items-center gap-2 font-display text-base font-bold">
        Ideas to test
        <EvidenceTag kind={IDEAS_EVIDENCE} />
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {hypotheses.map((h) => (
          <li key={h.id} data-testid="hypothesis" className="flex flex-col items-start gap-2 rounded-2xl bg-surface p-4 text-sm ring-1 ring-line">
            <HypothesisLabel />
            <span className="font-medium">{h.statement}</span>
            <p className="mt-auto text-xs text-ink-tertiary">Data basis: {h.basis.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
