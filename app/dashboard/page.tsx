import { ArrowRight } from 'lucide-react'
import { AgentPanel } from '@/components/AgentPanel'
import { CompetitorPanel } from '@/components/CompetitorPanel'
import { DataSourcesPanel, DataSourcesSummary } from '@/components/DataSourcesPanel'
import { ConfidenceKey } from '@/components/EvidenceLegend'
import { HypothesesPanel } from '@/components/HypothesesPanel'
import { PackagingPanel } from '@/components/PackagingPanel'
import { DashboardLive } from '@/components/dashboard/DashboardLive'
import { FilterBar, type Option } from '@/components/dashboard/FilterBar'
import { InsightCheck } from '@/components/dashboard/InsightCheck'
import { FeedbackCard, LiveStatus, Overview, PageViewsCard, ScansCard, WebCard } from '@/components/dashboard/LivePanels'
import { Reveal } from '@/components/dashboard/Reveal'
import { OpenSourcesButton, SourcesDrawer } from '@/components/dashboard/SourcesDrawer'
import { TopBar, type SectionLink } from '@/components/dashboard/TopBar'
import { seedPayload } from '@/lib/catalog'
import { dashboardQuery, filterChips, insightCardId, optionsWithScans, parseDashboardParams, type DashboardSummary } from '@/lib/dashboard'
import { getDashboard } from '@/lib/dashboardData'
import { insightsFor, packagingFor } from '@/lib/insights'
import { COLLECTION_QUESTIONS, type QuestionId } from '@/lib/agent'

// Dashboard (slice 4, ADR 0007; redesigned in ADR 0012). Behind the demo password (proxy.ts).
// The server renders every row with the first numbers filled in; DashboardLive refreshes them every 5 s
// and keeps them when a filter changes, so they move from the old value to the new one.
export const dynamic = 'force-dynamic'

type SP = Promise<Record<string, string | string[] | undefined>>

async function safeSummary(p: Parameters<typeof getDashboard>[0], what: string): Promise<DashboardSummary | null> {
  try {
    return await getDashboard(p)
  } catch (e) {
    // The page still renders; the cards show skeletons and "Reconnecting", and the poller fills them in.
    console.error(`[dashboard] ${what} reason=db: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`)
    return null
  }
}

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const params = parseDashboardParams(sp)
  const query = dashboardQuery(params)
  const filtered = Boolean(params.market || params.campaign)

  // The unfiltered summary says which markets and campaigns have scans for this bar (ADR 0012, decision 3).
  const [initial, unfiltered] = await Promise.all([
    safeSummary(params, 'initial'),
    filtered ? safeSummary({ ...params, market: null, campaign: null }, 'options') : Promise.resolve(null),
  ])
  const withScans = (filtered ? unfiltered : initial) ? optionsWithScans((filtered ? unfiltered : initial)!) : null

  const isProduct = params.view === 'product'
  const bars: Option[] = isProduct
    ? seedPayload.skus.map((s) => ({ value: s.id, label: s.name }))
    : seedPayload.collections.map((c) => ({ value: c.id, label: c.name }))
  const markets: Option[] = seedPayload.markets.map((m) => ({ value: m.code, label: m.name, disabled: withScans ? !withScans.markets.has(m.code) : false }))
  const campaigns: Option[] = seedPayload.campaigns.map((c) => ({ value: c.id, label: c.name, disabled: withScans ? !withScans.campaigns.has(c.id) : false }))

  const insights = insightsFor(params.id)
  const hasIdeas = isProduct && (insights.products.length > 0 || insights.hypotheses.length > 0 || packagingFor(params.id).length > 0)
  // Agent question links keep the dashboard's own view and filters (ADR 0006 handover).
  const hrefFor = (id: QuestionId) => `/dashboard?${query}&ask=${id}`

  const sections: SectionLink[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'scans', label: 'Scans' },
    { id: 'website', label: 'Website' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'agent', label: 'Agent' },
    ...(hasIdeas ? [{ id: 'ideas', label: 'Ideas' }] : []),
    { id: 'sources', label: 'Sources' },
  ]

  return (
    <DashboardLive query={query} view={params.view} initial={initial} collectionId={isProduct ? undefined : params.id}>
      <main id="main" className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-10 sm:px-6">
        <TopBar sections={sections} />

        <div className="flex flex-col gap-3">
          <FilterBar
            view={params.view}
            id={params.id}
            market={params.market}
            campaign={params.campaign}
            barLabel={isProduct ? 'Bar' : 'Collection'}
            bars={bars}
            markets={markets}
            campaigns={campaigns}
            chips={filterChips(params)}
          />
          <LiveStatus />
          <ConfidenceKey />
        </div>

        <Reveal id="overview" index={0} label="Overview">
          <Overview />
        </Reveal>

        <div className="grid items-start gap-4 md:grid-cols-2">
          <Reveal id="scans" index={1} label="Scans">
            <ScansCard />
          </Reveal>
          <Reveal id="website" index={2} label="Website">
            <WebCard />
          </Reveal>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-2">
          <Reveal id="feedback" index={3} label="Feedback">
            <FeedbackCard />
          </Reveal>
          <Reveal index={4} id="page-views" label="Page views">
            <PageViewsCard />
          </Reveal>
        </div>

        <Reveal id="agent" index={5} label="Product agent">
          <AgentPanel ask={sp.ask} hrefFor={hrefFor} questionIds={isProduct ? undefined : COLLECTION_QUESTIONS} filtersActive={filtered} />
        </Reveal>

        {hasIdeas && (
          <Reveal id="ideas" index={6} label="Ideas and market context" className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-bold">Ideas and market context</h2>
            <div className="grid items-start gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                <HypothesesPanel sku={params.id} />
                <PackagingPanel sku={params.id} />
              </div>
              {insights.products.length > 0 && <CompetitorPanel sku={params.id} />}
            </div>
            <InsightCheck cardId={insightCardId('insights', params.id)} className="rounded-full bg-surface px-4 py-1 ring-1 ring-line self-start" />
          </Reveal>
        )}

        <Reveal id="sources" index={7} label="Data sources">
          <DataSourcesSummary>
            <OpenSourcesButton className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-green-deep ring-1 ring-inset ring-line hover:bg-canvas">
              See all data sources
              <ArrowRight aria-hidden className="h-4 w-4" />
            </OpenSourcesButton>
          </DataSourcesSummary>
        </Reveal>
      </main>

      <SourcesDrawer>
        <DataSourcesPanel />
      </SourcesDrawer>
    </DashboardLive>
  )
}
