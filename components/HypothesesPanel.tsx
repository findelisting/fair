import { HypothesisLabel } from './HypothesisLabel'
import { insightsFor } from '@/lib/insights'

/** Improvement suggestions for the product view: one line each, labelled, with data basis (CLAUDE.md scope item 10). */
export function HypothesesPanel({ sku }: { sku?: string }) {
  const { hypotheses } = insightsFor(sku)
  if (hypotheses.length === 0) return null
  return (
    <section data-testid="hypotheses-panel" className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-2 font-display text-base font-bold">Ideas to test</h2>
      <ul className="divide-y divide-line text-sm">
        {hypotheses.map((h) => (
          <li key={h.id} data-testid="hypothesis" className="py-2">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{h.statement}</span>
              <HypothesisLabel />
            </p>
            <p className="mt-0.5 text-xs text-ink-tertiary">Data basis: {h.basis.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
