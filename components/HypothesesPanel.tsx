import { EvidenceTag } from './EvidenceTag'
import { HypothesisLabel } from './HypothesisLabel'
import { IDEAS_EVIDENCE } from '@/lib/evidence'
import { insightsFor } from '@/lib/insights'

/** Improvement suggestions for the product view: one line each, labelled, with data basis (CLAUDE.md scope item 10). */
export function HypothesesPanel({ sku }: { sku?: string }) {
  const { hypotheses } = insightsFor(sku)
  if (hypotheses.length === 0) return null
  return (
    <section data-testid="hypotheses-panel" className="p-5">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold">Ideas to test</h2>
        <EvidenceTag kind={IDEAS_EVIDENCE} />
      </header>
      <ul className="divide-y divide-line text-sm">
        {hypotheses.map((h) => (
          <li key={h.id} data-testid="hypothesis" className="flex flex-col items-start gap-1.5 py-3">
            <span className="font-medium">{h.statement}</span>
            <HypothesisLabel />
            <p className="text-xs text-ink-tertiary">Data basis: {h.basis.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
