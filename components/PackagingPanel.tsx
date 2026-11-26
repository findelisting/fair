import { ChevronRight, ExternalLink } from 'lucide-react'
import { SuggestionLabel } from './SuggestionLabel'
import { formatAccessDate, packagingFor } from '@/lib/insights'

/**
 * "Packaging ideas" card for the product view (ADR 0001, amendment 3).
 * Research-backed suggestions for the branding team: one line each, reasoning one click away.
 */
export function PackagingPanel({ sku }: { sku?: string }) {
  const ideas = packagingFor(sku)
  if (ideas.length === 0) return null
  return (
    <section data-testid="packaging-panel" className="p-5">
      <h2 className="mb-2 font-display text-base font-bold">Packaging ideas</h2>
      <ul className="divide-y divide-line text-sm">
        {ideas.map((idea) => (
          <li key={idea.id} data-testid="packaging-idea">
            <details className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1rem_1fr] gap-x-2 py-3 [&::-webkit-details-marker]:hidden">
                <ChevronRight aria-hidden className="mt-0.5 h-4 w-4 text-ink-tertiary transition group-open:rotate-90" />
                <span className="flex flex-col items-start gap-1.5">
                  <span className="font-medium">{idea.statement}</span>
                  <SuggestionLabel />
                </span>
              </summary>
              <div className="mb-3 ml-6 space-y-1">
                <p className="text-xs text-ink-tertiary">Data basis: {idea.basis.join(' · ')}</p>
                {idea.sources.map((s) => (
                  <p key={s.url + s.publisher} data-testid="packaging-source" className="text-xs">
                    <span className="text-ink-secondary">{s.note} </span>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-deep underline underline-offset-2">
                      {s.publisher}, {formatAccessDate(s.accessedOn)}
                      <ExternalLink aria-hidden className="h-3 w-3" />
                    </a>
                  </p>
                ))}
              </div>
            </details>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-tertiary">Ideas to explore, drawn from public research and the scan data. Sources are linked.</p>
    </section>
  )
}
