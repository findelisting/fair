import { ChevronRight, ExternalLink } from 'lucide-react'
import { EvidenceTag } from './EvidenceTag'
import { displayValue, formatAccessDate, insightsFor, snippetLine } from '@/lib/insights'

/**
 * "Market context" card for the product view (CLAUDE.md scope item 9, ADR 0001).
 * One collapsed line per competitor; expanding a row shows every value with its source and date.
 * No review label: sources are offered, not assigned. Server component, no client JS.
 */
export function CompetitorPanel({ sku }: { sku?: string }) {
  const { products, explore } = insightsFor(sku)
  if (products.length === 0 && explore.length === 0) return null
  const anyEstimate = products.some((p) => Object.values(p.sources).some((s) => s.estimate))
  return (
    <section data-testid="competitor-panel" className="rounded-2xl bg-surface p-5 ring-1 ring-line">
      <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold">
        Market context
        <EvidenceTag kind="reference" />
      </h3>
      <ul className="divide-y divide-line text-sm">
        {products.map((p) => {
          const first = Object.values(p.sources)[0]
          return (
            <li key={p.id} data-testid="competitor-product">
              <details className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[1rem_1fr] gap-x-2 py-3 [&::-webkit-details-marker]:hidden">
                  <ChevronRight aria-hidden className="mt-0.5 h-4 w-4 text-ink-tertiary transition group-open:rotate-90" />
                  <span className="flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium">
                        {p.brand} {p.product}
                      </span>
                      <span data-testid="competitor-snippet" className="font-semibold tabular-nums">
                        {snippetLine(p)}
                      </span>
                    </span>
                    <span className="text-xs text-ink-tertiary">
                      {first.publisher} · {formatAccessDate(first.accessedOn)}
                    </span>
                  </span>
                </summary>
                <dl className="mb-2 ml-7 space-y-1">
                  {p.values.map((v) => {
                    const s = p.sources[v.source]
                    return (
                      <div key={v.label} data-testid="competitor-value" className="flex flex-wrap items-baseline gap-x-2">
                        <dt className="w-24 text-ink-secondary">{v.label}</dt>
                        <dd className="font-medium">{displayValue(p, v)}</dd>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="value-source"
                          className="inline-flex items-center gap-1 text-xs text-green-deep underline underline-offset-2"
                        >
                          {s.publisher}, {formatAccessDate(s.accessedOn)}
                          <ExternalLink aria-hidden className="h-3 w-3" />
                        </a>
                      </div>
                    )
                  })}
                </dl>
              </details>
            </li>
          )
        })}
      </ul>
      {explore.length > 0 && (
        <p data-testid="explore-links" className="mt-2 text-sm">
          <span className="text-ink-secondary">Also worth a look: </span>
          {explore.map((e, i) => (
            <span key={e.url}>
              {i > 0 && ' · '}
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-green-deep underline underline-offset-2">
                {e.label}
              </a>
            </span>
          ))}
        </p>
      )}
      <p className="mt-3 text-xs text-ink-tertiary">
        {anyEstimate && 'Prices with ~ are estimates from public listings. '}Sources are linked so you can check any detail.
      </p>
    </section>
  )
}
