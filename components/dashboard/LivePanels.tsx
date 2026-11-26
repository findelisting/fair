'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { BarChart3, Eye, Globe, MessageSquare } from 'lucide-react'
import { DataBadge } from '@/components/DataBadge'
import { EmptyState } from '@/components/EmptyState'
import {
  badgeKind,
  campaignName,
  marketName,
  skuName,
  sumSplits,
  type DashboardSummary,
  type KeyedSplit,
  type View,
} from '@/lib/dashboard'
import { THEME_EXAMPLES } from '@/lib/synthetic'
import { TASTE_NOTES, type Theme } from '@/lib/themes'

// Number panels, refreshed every 5 s (ADR 0007, decisions 3 and 4).
// A failed poll keeps the last numbers and shows "Reconnecting"; a 401 sends the browser to sign in.
const POLL_MS = 5000
const TIMEOUT_MS = 4000

interface Props {
  query: string
  view: View
  initial: DashboardSummary | null
}

export function LivePanels({ query, view, initial }: Props) {
  const [data, setData] = useState<DashboardSummary | null>(initial)
  const [ok, setOk] = useState(initial !== null)
  const inFlight = useRef(false)
  const router = useRouter()

  useEffect(() => {
    let stopped = false
    const tick = async () => {
      if (stopped || inFlight.current || document.hidden) return
      inFlight.current = true
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      try {
        const res = await fetch(`/api/dashboard?${query}`, { cache: 'no-store', signal: ctrl.signal })
        if (res.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
          return
        }
        if (!res.ok) throw new Error(String(res.status))
        const next = (await res.json()) as DashboardSummary
        if (!stopped) {
          setData(next)
          setOk(true)
        }
      } catch {
        if (!stopped) setOk(false)
      } finally {
        clearTimeout(timer)
        inFlight.current = false
      }
    }
    const id = setInterval(tick, POLL_MS)
    if (!initial) void tick()
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [query, initial, router])

  return (
    <div className="flex flex-col gap-4">
      <p data-testid="poll-status" aria-live="polite" className="flex items-center gap-2 text-xs text-ink-tertiary">
        <span aria-hidden className={`h-2 w-2 rounded-full ${ok ? 'bg-green' : 'animate-pulse bg-amber-500'}`} />
        {ok ? `Updated ${data ? timeOf(data.asOf) : ''} · refreshes every 5 seconds` : 'Reconnecting…'}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <ScansPanel data={data} view={view} />
        <PageViewsPanel data={data} />
        <FeedbackPanel data={data} />
        <WebPanel data={data} />
      </div>
    </div>
  )
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Berlin' })
}

const fmt = (n: number) => n.toLocaleString('en-GB')

function Panel({ id, title, icon, kind, children }: { id: string; title: string; icon: React.ReactNode; kind: ReturnType<typeof badgeKind>; children: React.ReactNode }) {
  return (
    <section data-testid={id} className="flex flex-col gap-3 rounded-2xl bg-surface p-5 ring-1 ring-line">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          {icon}
          {title}
        </h2>
        <DataBadge kind={kind} />
      </header>
      {children}
    </section>
  )
}

/** Horizontal bars: live part in green, synthetic part in the synthetic colour. */
function Bars({ rows, label }: { rows: KeyedSplit[]; label: (key: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.live + r.synthetic))
  return (
    <ul className="flex flex-col gap-1.5 text-xs">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2">
          <span className="truncate text-ink-secondary">{label(r.key)}</span>
          <span className="flex h-2.5 overflow-hidden rounded-full bg-canvas" aria-hidden>
            <span className="bg-green" style={{ width: `${(r.live / max) * 100}%` }} />
            <span className="bg-synthetic/60" style={{ width: `${(r.synthetic / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{fmt(r.live + r.synthetic)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Daily columns as one small SVG. */
function Spark({ values, title }: { values: number[]; title: string }) {
  const max = Math.max(1, ...values)
  const w = 300
  const h = 48
  const bw = w / Math.max(1, values.length)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" role="img" aria-label={title}>
      {values.map((v, i) => (
        <rect key={i} x={i * bw + 0.5} y={h - (v / max) * h} width={Math.max(1, bw - 1)} height={(v / max) * h} className="fill-green/70" />
      ))}
    </svg>
  )
}

function ScansPanel({ data, view }: { data: DashboardSummary | null; view: View }) {
  const s = data?.scans
  const total = s ? s.total.live + s.total.synthetic : 0
  return (
    <Panel id="panel-scans" title="QR scans" icon={<BarChart3 aria-hidden className="h-4 w-4 text-green" />} kind={badgeKind(s?.total ?? { live: 0, synthetic: 0 })}>
      {!s || total === 0 ? (
        <EmptyState hint={data ? 'No scans in this selection yet.' : 'Waiting for data…'} />
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span data-testid="scan-total" className="font-display text-3xl font-bold tabular-nums">{fmt(total)}</span>
            <span className="text-xs text-ink-secondary">
              last 60 days · <span data-testid="scan-live">{fmt(s.total.live)}</span> live
            </span>
          </p>
          <Spark values={s.byDay.map((d) => d.live + d.synthetic)} title="Scans per day, last 60 days" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">By campaign</h3>
          <Bars rows={s.byCampaign} label={campaignName} />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">By market</h3>
          <Bars rows={s.byMarket} label={marketName} />
          {view === 'collection' && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">By bar</h3>
              <Bars rows={[...s.bySku, { key: 'collection code', ...s.collectionCode }]} label={(k) => (k === 'collection code' ? 'Collection code' : skuName(k))} />
            </>
          )}
        </>
      )}
    </Panel>
  )
}

const PAGE_LABELS: Record<string, string> = { product: 'Product page', feedback: 'Feedback page', collection: 'Collection page' }

function PageViewsPanel({ data }: { data: DashboardSummary | null }) {
  const rows = data?.pageViews.byPage ?? []
  const split = sumSplits(rows)
  return (
    <Panel id="panel-page-views" title="Page views" icon={<Eye aria-hidden className="h-4 w-4 text-green" />} kind={badgeKind(split)}>
      {split.live + split.synthetic === 0 ? <EmptyState hint="No page views in this selection yet." /> : <Bars rows={rows} label={(k) => PAGE_LABELS[k] ?? k} />}
    </Panel>
  )
}

const NOTE_LABEL = new Map(TASTE_NOTES.map((n) => [n.value, n.label]))

function FeedbackPanel({ data }: { data: DashboardSummary | null }) {
  const f = data?.feedback
  const total = f ? f.total.live + f.total.synthetic : 0
  return (
    <Panel id="panel-feedback" title="Feedback" icon={<MessageSquare aria-hidden className="h-4 w-4 text-green" />} kind={badgeKind(f?.total ?? { live: 0, synthetic: 0 })}>
      {!f || total === 0 ? (
        <EmptyState hint="No feedback in this selection yet." />
      ) : (
        <>
          <p className="text-sm">
            <span className="font-display text-2xl font-bold tabular-nums">{fmt(total)}</span> answers
            {f.avgRating !== null && <span className="text-ink-secondary"> · average rating {f.avgRating} / 5</span>}
          </p>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Themes</h3>
          <Bars rows={f.themes} label={(k) => k} />
          {f.themes[0] && (
            <p className="rounded-lg bg-canvas px-3 py-2 text-xs italic text-ink-secondary">
              Example ({f.themes[0].key}): “{THEME_EXAMPLES[f.themes[0].key as Theme] ?? ''}” <span className="not-italic">Synthetic example</span>
            </p>
          )}
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Latest live answers</h3>
          {f.recent.length === 0 ? (
            <p className="text-xs text-ink-tertiary">No live answers yet. Scan a feedback code to add one.</p>
          ) : (
            <ul data-testid="recent-feedback" className="flex flex-col gap-2 text-xs">
              {f.recent.map((r) => (
                <li key={r.ts + r.tasteNote} className="rounded-lg bg-canvas px-3 py-2">
                  <p className="font-medium">
                    {'★'.repeat(r.rating)} {NOTE_LABEL.get(r.tasteNote) ?? r.tasteNote}
                  </p>
                  {r.freeText && <p className="text-ink-secondary">{r.freeText}</p>}
                  <p className="text-ink-tertiary">
                    {skuName(r.sku)} · {r.campaign ? campaignName(r.campaign) : 'No campaign'} · {r.market ? marketName(r.market) : 'No market'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  )
}

function WebPanel({ data }: { data: DashboardSummary | null }) {
  const w = data?.web
  const t = w?.total
  return (
    <Panel id="panel-web" title="Website metrics" icon={<Globe aria-hidden className="h-4 w-4 text-green" />} kind="synthetic">
      {!t || t.sessions === 0 ? (
        <EmptyState hint="No website data in this selection." />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Sessions', t.sessions],
              ['Page views', t.pageViews],
              ['Video plays', t.videoPlays],
              ['Shop clicks', t.shopClicks],
            ].map(([label, v]) => (
              <div key={label}>
                <dt className="text-xs text-ink-tertiary">{label}</dt>
                <dd className="font-display text-xl font-bold tabular-nums">{fmt(v as number)}</dd>
              </div>
            ))}
          </dl>
          <Spark values={w.byDay.map((d) => d.sessions)} title="Sessions per day, last 60 days" />
          <p className="text-xs text-ink-tertiary">Mock website connector. Videos stay on fairafric’s own site.</p>
        </>
      )}
    </Panel>
  )
}
