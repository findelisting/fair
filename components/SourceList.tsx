import { DataBadge, type DataKind } from './DataBadge'

export interface Source {
  /** What the number came from, e.g. "scan_events" or a retailer listing. */
  name: string
  /** Optional detail: filters, row count, or what was used. */
  detail?: string
  /** Link for public sources (competitor panel). */
  url?: string
  /** As-of or access date, already formatted for display. */
  date: string
  /** Live / synthetic badge. Omitted for real public sources (retailer listings), which are neither (ADR 0006). */
  kind?: DataKind
}

/** Lists the sources under an agent answer or a competitor value (CLAUDE.md scope items 8 and 9). */
export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null
  return (
    <div data-testid="source-list" className="mt-3 rounded-lg border border-line bg-canvas/60 p-3 text-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Sources</p>
      <ul className="space-y-2">
        {sources.map((s, i) => (
          <li key={`${s.name}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-green-deep underline underline-offset-2">
                {s.name}
              </a>
            ) : (
              <span className="font-medium">{s.name}</span>
            )}
            {s.detail && <span className="text-ink-secondary">{s.detail}</span>}
            <span className="text-ink-tertiary">as of {s.date}</span>
            {s.kind && <DataBadge kind={s.kind} />}
          </li>
        ))}
      </ul>
    </div>
  )
}
