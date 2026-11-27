import { EvidenceTag } from './EvidenceTag'
import { EVIDENCE, type EvidenceKind } from '@/lib/evidence'

/** Evidence-tag explainer, sitting in the legend row next to the chart key (ADR 0010, compacted in ADR 0011). */
export function EvidenceLegend() {
  return (
    <details data-testid="evidence-legend" className="group relative text-xs">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 font-semibold text-green-deep underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
        How sure is each number?
        <span aria-hidden className="transition group-open:rotate-90">›</span>
      </summary>
      <ul className="absolute right-0 z-20 mt-2 flex w-[min(22rem,85vw)] flex-col gap-2 rounded-2xl bg-surface p-4 shadow-xl ring-1 ring-line">
        {(Object.keys(EVIDENCE) as EvidenceKind[]).map((k) => (
          <li key={k} data-testid="evidence-legend-item" className="flex items-start gap-2">
            <EvidenceTag kind={k} className="shrink-0" />
            <span className="text-ink-secondary">{EVIDENCE[k].meaning}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
