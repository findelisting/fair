import { Plug } from 'lucide-react'
import { DataBadge } from './DataBadge'
import { DATA_SOURCES, NOT_CONNECTED_LABEL, PILOT_NOTE } from '@/lib/dataSources'

/** What feeds the dashboard today, and what a pilot could connect (ADR 0009). Static: nothing is connected or stored. */
export function DataSourcesPanel() {
  const connected = DATA_SOURCES.filter((s) => s.status !== 'available')
  const available = DATA_SOURCES.filter((s) => s.status === 'available')
  return (
    <section id="data-sources" data-testid="data-sources-panel" aria-labelledby="data-sources-title" className="scroll-mt-6 rounded-2xl bg-surface p-5 ring-1 ring-line">
      <h2 id="data-sources-title" className="flex items-center gap-2 font-display text-base font-bold">
        <Plug aria-hidden className="h-4 w-4 text-green" />
        Data sources
      </h2>
      <p className="mt-1 text-sm text-ink-secondary">What feeds this dashboard today, and what Finde can connect next.</p>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-tertiary">Connected</h3>
          <ul className="mt-2 divide-y divide-line text-sm">
            {connected.map((s) => (
              <li key={s.id} data-testid="source-connected" className="flex items-start justify-between gap-3 py-3">
                <span>
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-ink-tertiary">{s.adds}</span>
                </span>
                <DataBadge kind={s.status === 'live' ? 'live' : 'synthetic'} className="shrink-0" />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-tertiary">Available in a pilot</h3>
          <ul className="mt-2 divide-y divide-line text-sm">
            {available.map((s) => (
              <li key={s.id} data-testid="source-available" className="py-3">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="font-medium">{s.name}</span>
                      <span className="block text-xs text-ink-tertiary">{s.adds}</span>
                      <span className="mt-1 inline-block rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-secondary ring-1 ring-inset ring-line">
                        {NOT_CONNECTED_LABEL}
                      </span>
                    </span>
                    <span className="inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-green-deep ring-1 ring-inset ring-line transition-colors group-open:bg-canvas hover:bg-canvas">
                      Request
                    </span>
                  </summary>
                  <p data-testid="source-note" className="mt-2 rounded-xl bg-canvas p-3 text-xs text-ink-secondary">
                    {PILOT_NOTE}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-tertiary">Demo: only the sources marked Live or Synthetic data feed this dashboard. Nothing else is connected.</p>
    </section>
  )
}
