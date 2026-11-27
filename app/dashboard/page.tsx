import Link from 'next/link'
import { ArrowLeft, Plug, QrCode } from 'lucide-react'
import { AgentPanel } from '@/components/AgentPanel'
import { CompetitorPanel } from '@/components/CompetitorPanel'
import { DataSourcesPanel } from '@/components/DataSourcesPanel'
import { EvidenceLegend } from '@/components/EvidenceLegend'
import { HypothesesPanel } from '@/components/HypothesesPanel'
import { PackagingPanel } from '@/components/PackagingPanel'
import { InsightCheck } from '@/components/dashboard/InsightCheck'
import { LivePanels } from '@/components/dashboard/LivePanels'
import { seedPayload } from '@/lib/catalog'
import { dashboardQuery, insightCardId, parseDashboardParams, type DashboardSummary } from '@/lib/dashboard'
import { getDashboard } from '@/lib/dashboardData'
import { insightsFor, packagingFor } from '@/lib/insights'
import type { QuestionId } from '@/lib/agent'

// Dashboard (slice 4, ADR 0007). Behind the demo password (proxy.ts).
// The server renders the shell, the filters and the insight cards with the first numbers filled in;
// LivePanels refreshes the numbers every 5 s.
export const dynamic = 'force-dynamic'

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const params = parseDashboardParams(sp)
  const query = dashboardQuery(params)

  let initial: DashboardSummary | null = null
  try {
    initial = await getDashboard(params)
  } catch (e) {
    // The page still renders; the panels say "Reconnecting" and the poller fills them in.
    console.error(`[dashboard] initial reason=db: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`)
  }

  const isProduct = params.view === 'product'
  const options = isProduct ? seedPayload.skus.map((s) => ({ id: s.id, name: s.name })) : seedPayload.collections.map((c) => ({ id: c.id, name: c.name }))
  const tab = (view: 'product' | 'collection', label: string) => (
    <Link
      href={`/dashboard?view=${view}`}
      aria-current={params.view === view ? 'page' : undefined}
      className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors ${params.view === view ? 'bg-green text-white' : 'text-ink-secondary hover:bg-canvas'}`}
    >
      {label}
    </Link>
  )
  const insights = insightsFor(params.id)
  // Agent question links keep the dashboard's own view and filters (ADR 0006 handover).
  const hrefFor = (id: QuestionId) => `/dashboard?${query}&ask=${id}`

  return (
    <main id="main" className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-8">
      <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-secondary underline-offset-4 hover:text-green-deep hover:underline">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Demo guide
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green">Finde × fairafric · Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{options.find((o) => o.id === params.id)?.name}</h1>
        </div>
        <nav className="flex gap-1 rounded-full bg-surface p-1 ring-1 ring-line" aria-label="View">
          {tab('product', 'Product view')}
          {tab('collection', 'Collection view')}
        </nav>
      </header>

      <form method="get" action="/dashboard" className="flex flex-wrap items-end gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
        <input type="hidden" name="view" value={params.view} />
        <Select name="id" label={isProduct ? 'Bar' : 'Collection'} value={params.id} options={options.map((o) => [o.id, o.name])} />
        <Select name="market" label="Market" value={params.market ?? ''} options={[['', 'All markets'], ...seedPayload.markets.map((m) => [m.code, m.name] as [string, string])]} />
        <Select name="campaign" label="Campaign" value={params.campaign ?? ''} options={[['', 'All campaigns'], ...seedPayload.campaigns.map((c) => [c.id, c.name] as [string, string])]} />
        <button type="submit" className="min-h-11 rounded-full bg-green px-5 text-sm font-semibold text-white transition-colors hover:bg-green-deep">
          Apply
        </button>
        <a href="#data-sources" className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-green-deep ring-1 ring-inset ring-line transition-colors hover:bg-canvas">
          <Plug aria-hidden className="h-4 w-4" />
          Data sources
        </a>
        <Link href="/dashboard/codes" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-green-deep ring-1 ring-inset ring-line transition-colors hover:bg-canvas">
          <QrCode aria-hidden className="h-4 w-4" />
          QR codes
        </Link>
      </form>

      <EvidenceLegend />

      <LivePanels key={query} query={query} view={params.view} initial={initial} collectionId={isProduct ? undefined : params.id} />

      <AgentPanel ask={sp.ask} hrefFor={hrefFor} />

      {isProduct && (
        <section className="grid items-start gap-4 md:grid-cols-3" aria-label="Research and ideas">
          {insights.products.length > 0 && (
            <div className="flex flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
              <CompetitorPanel sku={params.id} />
              <InsightCheck cardId={insightCardId('market-context', params.id)} />
            </div>
          )}
          {insights.hypotheses.length > 0 && (
            <div className="flex flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
              <HypothesesPanel sku={params.id} />
              <InsightCheck cardId={insightCardId('ideas', params.id)} />
            </div>
          )}
          {packagingFor(params.id).length > 0 && (
            <div className="flex flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
              <PackagingPanel sku={params.id} />
              <InsightCheck cardId={insightCardId('packaging', params.id)} />
            </div>
          )}
        </section>
      )}

      <DataSourcesPanel />
    </main>
  )
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: [string, string][] }) {
  return (
    <label className="flex w-full flex-col gap-1 text-xs font-medium text-ink-secondary sm:w-auto">
      {label}
      <select name={name} defaultValue={value} className="min-h-11 rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
