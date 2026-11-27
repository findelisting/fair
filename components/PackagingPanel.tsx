import { ExternalLink } from 'lucide-react'
import { SuggestionLabel } from './SuggestionLabel'
import { formatAccessDate, packagingFor } from '@/lib/insights'

/**
 * Packaging ideas for the branding team (ADR 0001, amendment 3): one light card per idea since ADR 0012,
 * each with its status, data basis and source links.
 */
export function PackagingPanel({ sku }: { sku?: string }) {
  const ideas = packagingFor(sku)
  if (ideas.length === 0) return null
  return (
    <section data-testid="packaging-panel" aria-labelledby="packaging-title" className="flex flex-col gap-3">
      <h3 id="packaging-title" className="font-display text-base font-bold">
        Packaging ideas
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ideas.map((idea) => (
          <li key={idea.id} data-testid="packaging-idea" className="flex flex-col items-start gap-2 rounded-2xl bg-surface p-4 text-sm ring-1 ring-line">
            <SuggestionLabel />
            <span className="font-medium">{idea.statement}</span>
            <p className="text-xs text-ink-tertiary">Data basis: {idea.basis.join(' · ')}</p>
            <div className="mt-auto space-y-1">
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
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-tertiary">Ideas to explore, drawn from public research and the scan data. Sources are linked.</p>
    </section>
  )
}
