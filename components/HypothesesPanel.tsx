import { HypothesisLabel } from './HypothesisLabel'
import { hypotheses as allHypotheses, type Hypothesis } from '@/lib/insights'

/** Improvement suggestions, each labelled "Hypothesis, not validated" with its data basis (CLAUDE.md scope item 10). */
export function HypothesesPanel({ hypotheses = allHypotheses }: { hypotheses?: Hypothesis[] }) {
  return (
    <section data-testid="hypotheses-panel" className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-4 font-display text-lg font-bold">Improvement suggestions</h2>
      <ul className="space-y-3">
        {hypotheses.map((h) => (
          <li key={h.id} data-testid="hypothesis" className="rounded-lg border border-line p-4">
            <HypothesisLabel />
            <p className="mt-2 font-medium">{h.statement}</p>
            <p className="mt-1 text-sm text-ink-secondary">
              <span className="font-semibold">Data basis:</span> {h.basis.join('; ')}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
