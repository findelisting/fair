import { Lightbulb } from 'lucide-react'

export const HYPOTHESIS_LABEL_TEXT = 'Hypothesis, not validated'

/** Required on every improvement suggestion (CLAUDE.md scope item 10). */
export function HypothesisLabel() {
  return (
    <span
      data-testid="hypothesis-label"
      className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-inset ring-brand/40"
    >
      <Lightbulb aria-hidden className="h-3.5 w-3.5" />
      {HYPOTHESIS_LABEL_TEXT}
    </span>
  )
}
