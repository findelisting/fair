import { Sparkles } from 'lucide-react'

export const SUGGESTION_LABEL_TEXT = 'Suggestion, not validated'

/** Required on every packaging idea (ADR 0001, amendment 3). */
export function SuggestionLabel() {
  return (
    <span
      data-testid="suggestion-label"
      className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-inset ring-brand/40"
    >
      <Sparkles aria-hidden className="h-3.5 w-3.5" />
      {SUGGESTION_LABEL_TEXT}
    </span>
  )
}
