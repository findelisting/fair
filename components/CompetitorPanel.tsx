import { ExternalLink } from 'lucide-react'
import { competitors, formatAccessDate, type CompetitorProduct } from '@/lib/insights'

/**
 * Static competitor references (CLAUDE.md scope item 9, ADR 0001).
 * Every value shows its source and access date. No review label: sources are offered, not assigned.
 */
export function CompetitorPanel({ products = competitors }: { products?: CompetitorProduct[] }) {
  return (
    <section data-testid="competitor-panel" className="rounded-xl border border-line bg-surface p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Competitor comparison</h2>
        <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-secondary ring-1 ring-inset ring-line">
          Public references
        </span>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <article key={p.id} data-testid="competitor-product" className="rounded-lg border border-line p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
              {p.brand} · {p.market}
            </p>
            <h3 className="mb-3 font-semibold">{p.product}</h3>
            <dl className="space-y-2 text-sm">
              {p.values.map((v) => {
                const s = p.sources[v.source]
                return (
                  <div key={v.label} data-testid="competitor-value" className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <dt className="text-ink-secondary">{v.label}</dt>
                    <dd className="font-medium">
                      {v.value}
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="value-source"
                        className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-green-deep underline underline-offset-2"
                      >
                        {s.publisher}, {formatAccessDate(s.accessedOn)}
                        <ExternalLink aria-hidden className="h-3 w-3" />
                      </a>
                    </dd>
                  </div>
                )
              })}
            </dl>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-tertiary">Sources are linked so you can check any detail.</p>
    </section>
  )
}
