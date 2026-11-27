import { EvidenceTag } from './EvidenceTag'
import { EVIDENCE, type EvidenceKind } from '@/lib/evidence'

/** One line per evidence tag, shown once above the panels (ADR 0010). */
export function EvidenceLegend() {
  return (
    <details data-testid="evidence-legend" className="rounded-2xl bg-surface px-4 py-3 text-sm ring-1 ring-line">
      <summary className="cursor-pointer font-semibold text-ink-secondary">How sure is each number?</summary>
      <ul className="mt-3 grid gap-2 md:grid-cols-2">
        {(Object.keys(EVIDENCE) as EvidenceKind[]).map((k) => (
          <li key={k} data-testid="evidence-legend-item" className="flex items-start gap-2">
            <EvidenceTag kind={k} className="shrink-0" />
            <span className="text-xs text-ink-secondary">{EVIDENCE[k].meaning}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
