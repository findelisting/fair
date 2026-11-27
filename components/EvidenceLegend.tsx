import { EvidenceGlyph } from './EvidenceTag'
import { EVIDENCE, type EvidenceKind } from '@/lib/evidence'

const KINDS = Object.keys(EVIDENCE) as EvidenceKind[]

/**
 * The data-confidence key (ADR 0012, spec 3.1): always visible under the filters, with the Live / Synthetic
 * key beside it, and repeated in a "How sure?" popover so it is never out of reach.
 */
export function ConfidenceKey() {
  return (
    <section
      id="confidence-key"
      data-testid="confidence-key"
      aria-label="How sure is each number"
      className="flex scroll-mt-40 flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-surface px-4 py-3 text-xs text-ink-secondary ring-1 ring-line"
    >
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="How a number is known">
        {KINDS.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <EvidenceGlyph kind={k} className="text-ink" />
            <span>
              <span className="font-semibold text-ink">{EVIDENCE[k].label}</span> · {EVIDENCE[k].short}
            </span>
          </li>
        ))}
      </ul>
      <ul className="flex items-center gap-4 border-line md:border-l md:pl-6" aria-label="Where a number comes from">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-sm bg-series-live" />
          <span className="font-semibold text-ink">Live</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="mark-synthetic h-3 w-3 rounded-sm" />
          <span className="font-semibold text-ink">Synthetic</span>
        </li>
      </ul>
      <EvidenceLegend />
    </section>
  )
}

/** "How sure?" popover with the full meaning of each kind (ADR 0010, compacted in ADR 0011 and 0012). */
export function EvidenceLegend() {
  return (
    <details data-testid="evidence-legend" className="group relative ml-auto text-xs">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-full px-3 font-semibold text-green-deep ring-1 ring-inset ring-line hover:bg-canvas [&::-webkit-details-marker]:hidden">
        How sure?
        <span aria-hidden className="transition group-open:rotate-90">
          ›
        </span>
      </summary>
      <ul className="pop-in absolute right-0 z-30 mt-2 flex w-[min(22rem,85vw)] flex-col gap-2 rounded-2xl bg-surface p-4 shadow-xl ring-1 ring-line">
        {KINDS.map((k) => (
          <li key={k} data-testid="evidence-legend-item" className="flex items-start gap-2">
            <EvidenceGlyph kind={k} className="mt-0.5 text-ink" />
            <span className="text-ink-secondary">
              <span className="font-semibold text-ink">{EVIDENCE[k].label}.</span> {EVIDENCE[k].meaning}
            </span>
          </li>
        ))}
        <li className="border-t border-line pt-2 text-ink-secondary">
          <span className="font-semibold text-ink">Live</span> numbers come from real scans and answers in this demo;{' '}
          <span className="font-semibold text-ink">Synthetic</span> numbers are generated history, labelled on every card.
        </li>
      </ul>
    </details>
  )
}
