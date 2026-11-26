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
import { skusInCollection } from '@/lib/catalog'
import { THEME_EXAMPLES } from '@/lib/synthetic'
import { TASTE_NOTES, type Theme } from '@/lib/themes'

// Number panels, refreshed every 5 s (ADR 0007, decisions 3 and 4).
// A failed poll keeps the last numbers and shows "Reconnecting"; a 401 sends the browser to sign in.
const POLL_MS = 5000
const TIMEOUT_MS = 4000
/** How long a number that just went up stays highlighted. */
const FLASH_MS = 4000

interface Props {
  query: string
  view: View
  initial: DashboardSummary | null
  /** In the collection view: the collection, so every bar gets a row even with no scans. */
  collectionId?: string
}

/** New live scans and answers since the previous poll, shown as "+N live" on the number. */
interface Flash {
  scans: number
  feedback: number
}

export function LivePanels({ query, view, initial, collectionId }: Props) {
  const [data, setData] = useState<DashboardSummary | null>(initial)
  const [ok, setOk] = useState(initial !== null)
  const [flash, setFlash] = useState<Flash>({ scans: 0, feedback: 0 })
  const inFlight = useRef(false)
  const last = useRef<DashboardSummary | null>(initial)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
          // The live moment (design brief): highlight a number when new live rows arrive.
          const prev = last.current
          const scans = prev ? next.scans.total.live - prev.scans.total.live : 0
          const feedback = prev ? next.feedback.total.live - prev.feedback.total.live : 0
          if (scans > 0 || feedback > 0) {
            setFlash({ scans: Math.max(0, scans), feedback: Math.max(0, feedback) })
            if (flashTimer.current) clearTimeout(flashTimer.current)
            flashTimer.current = setTimeout(() => setFlash({ scans: 0, feedback: 0 }), FLASH_MS)
          }
          last.current = next
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
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [query, initial, router])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p data-testid="poll-status" aria-live="polite" className="flex items-center gap-2 text-xs text-ink-tertiary">
          <span aria-hidden className={`h-2 w-2 rounded-full ${ok ? 'bg-green' : 'bg-amber-500'}`} />
          {ok ? `Updated ${data ? timeOf(data.asOf) : ''} · refreshes every 5 seconds` : 'Reconnecting…'}
          {flash.scans > 0 && <span className="font-semibold text-green-deep"> · New live scan</span>}
          {flash.feedback > 0 && <span className="font-semibold text-green-deep"> · New live answer</span>}
        </p>
        {/* Chart legend: identity is colour plus texture, never colour alone. */}
        <p className="flex items-center gap-4 text-xs text-ink-secondary" aria-label="Chart legend">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-sm bg-series-live" />
            Live
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="mark-synthetic h-3 w-3 rounded-sm" />
            Synthetic
          </span>
        </p>
      </div>
      {/* Two independent columns, so a short panel never leaves a gap beside a tall one. */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ScansPanel data={data} view={view} flash={flash.scans} collectionId={collectionId} />
          <WebPanel data={data} />
        </div>
        <div className="flex flex-col gap-4">
          <FeedbackPanel data={data} flash={flash.feedback} />
          <PageViewsPanel data={data} />
        </div>
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
    <section data-testid={id} className="flex flex-col gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line md:p-6">
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

/**
 * Horizontal bars: live part in solid green, synthetic part striped (dataviz mark spec: thin bar,
 * rounded data end, 2px surface gap between segments). Hovering a row shows the exact split.
 */
function Bars({ rows, label }: { rows: KeyedSplit[]; label: (key: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.live + r.synthetic))
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {rows.map((r) => {
        const name = label(r.key)
        return (
          <li
            key={r.key}
            title={`${name}: ${fmt(r.live)} live, ${fmt(r.synthetic)} synthetic`}
            className="grid grid-cols-[minmax(6rem,10rem)_1fr_3.5rem] items-center gap-3 rounded-md py-0.5 hover:bg-canvas/70"
          >
            <span className="line-clamp-2 leading-tight text-ink-secondary">{name}</span>
            <span className="bar-wipe flex h-3 gap-0.5" aria-hidden>
              {r.live > 0 && <span className="rounded-l-sm rounded-r-[4px] bg-series-live" style={{ width: `${(r.live / max) * 100}%` }} />}
              {r.synthetic > 0 && <span className="mark-synthetic rounded-l-sm rounded-r-[4px]" style={{ width: `${(r.synthetic / max) * 100}%` }} />}
            </span>
            <span className="text-right font-medium tabular-nums text-ink">{fmt(r.live + r.synthetic)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Daily columns as one small SVG: synthetic striped at the base, live solid on top. Hover a day for its numbers. */
function Spark({ days, title }: { days: { live: number; synthetic: number; label?: string }[]; title: string }) {
  const max = Math.max(1, ...days.map((d) => d.live + d.synthetic))
  const w = 300
  const h = 56
  const bw = w / Math.max(1, days.length)
  const y = (v: number) => (v / max) * h
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="bar-wipe h-14 w-full" role="img" aria-label={title}>
      <defs>
        <pattern id="spark-stripe" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="var(--color-series-synthetic)" />
          <rect width="1.5" height="4" fill="white" opacity="0.38" />
        </pattern>
      </defs>
      <line x1="0" x2={w} y1={h - 0.5} y2={h - 0.5} stroke="var(--color-line)" strokeWidth="1" />
      {days.map((d, i) => {
        const x = i * bw + 0.5
        const bwInner = Math.max(1, bw - 1.5)
        const hs = y(d.synthetic)
        const hl = y(d.live)
        return (
          <g key={i}>
            <title>{`${d.label ? `${d.label}: ` : ''}${fmt(d.live + d.synthetic)} (${fmt(d.live)} live)`}</title>
            {/* Full-height hit area, bigger than the mark. */}
            <rect x={i * bw} y={0} width={bw} height={h} fill="transparent" />
            {hs > 0 && <rect x={x} y={h - hs} width={bwInner} height={hs} fill="url(#spark-stripe)" />}
            {hl > 0 && <rect x={x} y={h - hs - hl} width={bwInner} height={hl} fill="var(--color-series-live)" />}
          </g>
        )
      })}
    </svg>
  )
}

/** "+N live" next to a number that just went up. Static under reduced motion. */
function LiveTag({ n }: { n: number }) {
  if (n <= 0) return null
  return <span className="live-tag rounded-full bg-series-live px-2 py-0.5 text-xs font-semibold text-white">+{fmt(n)} live</span>
}

function ScansPanel({ data, view, flash, collectionId }: { data: DashboardSummary | null; view: View; flash: number; collectionId?: string }) {
  const s = data?.scans
  const total = s ? s.total.live + s.total.synthetic : 0
  // Every bar of the collection gets a row, with 0 when the selection has no scans for it.
  const bySku = s
    ? collectionId
      ? skusInCollection(collectionId).map((sku) => s.bySku.find((r) => r.key === sku.id) ?? { key: sku.id, live: 0, synthetic: 0 })
      : s.bySku
    : []
  return (
    <Panel id="panel-scans" title="QR scans" icon={<BarChart3 aria-hidden className="h-4 w-4 text-green" />} kind={badgeKind(s?.total ?? { live: 0, synthetic: 0 })}>
      {!s || total === 0 ? (
        <EmptyState hint={data ? 'No scans in this selection yet.' : 'Waiting for data…'} />
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-2">
            <span data-testid="scan-total" className={`font-display text-4xl font-extrabold tracking-tight tabular-nums ${flash > 0 ? 'live-flash' : ''}`}>{fmt(total)}</span>
            <LiveTag n={flash} />
            <span className="text-xs text-ink-secondary">
              last 60 days · <span data-testid="scan-live">{fmt(s.total.live)}</span> live
            </span>
          </p>
          <Spark days={s.byDay.map((d) => ({ live: d.live, synthetic: d.synthetic, label: d.key }))} title="Scans per day, last 60 days" />
          <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">By campaign</h3>
          <Bars rows={s.byCampaign} label={campaignName} />
          <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">By market</h3>
          <Bars rows={s.byMarket} label={marketName} />
          {view === 'collection' && (
            <>
              <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">By bar</h3>
              <Bars rows={[...bySku, { key: 'collection code', ...s.collectionCode }]} label={(k) => (k === 'collection code' ? 'Collection code' : skuName(k))} />
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

function FeedbackPanel({ data, flash }: { data: DashboardSummary | null; flash: number }) {
  const f = data?.feedback
  const total = f ? f.total.live + f.total.synthetic : 0
  return (
    <Panel id="panel-feedback" title="Feedback" icon={<MessageSquare aria-hidden className="h-4 w-4 text-green" />} kind={badgeKind(f?.total ?? { live: 0, synthetic: 0 })}>
      {!f || total === 0 ? (
        <EmptyState hint="No feedback in this selection yet." />
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className={`font-display text-4xl font-extrabold tracking-tight tabular-nums ${flash > 0 ? 'live-flash' : ''}`}>{fmt(total)}</span> answers
            <LiveTag n={flash} />
            {f.avgRating !== null && <span className="text-ink-secondary">· average rating {f.avgRating} / 5</span>}
          </p>
          <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Themes</h3>
          <Bars rows={f.themes} label={(k) => k} />
          {f.themes[0] && (
            <p className="rounded-xl border-l-4 border-series-synthetic bg-synthetic-surface px-4 py-3 text-sm italic text-ink-secondary">
              Example ({f.themes[0].key}): “{THEME_EXAMPLES[f.themes[0].key as Theme] ?? ''}” <span className="mt-1 block text-xs font-semibold not-italic text-synthetic">Synthetic example</span>
            </p>
          )}
          {f.themes.length > 1 && (
            <details className="group text-sm">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 font-medium text-green-deep [&::-webkit-details-marker]:hidden">
                <span className="transition group-open:rotate-90" aria-hidden>
                  ›
                </span>
                An example for every theme
              </summary>
              <ul className="mt-1 flex flex-col gap-2">
                {f.themes.slice(1).map((t) => (
                  <li key={t.key} className="rounded-xl bg-synthetic-surface px-4 py-2 text-ink-secondary">
                    <span className="font-semibold not-italic text-ink">{t.key}: </span>
                    <span className="italic">“{THEME_EXAMPLES[t.key as Theme] ?? ''}”</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs font-semibold text-synthetic">Synthetic examples</p>
            </details>
          )}
          <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Latest live answers</h3>
          {f.recent.length === 0 ? (
            <p className="text-xs text-ink-tertiary">No live answers yet. Scan a feedback code to add one.</p>
          ) : (
            <ul data-testid="recent-feedback" className="flex flex-col gap-2 text-sm">
              {f.recent.map((r) => (
                <li key={r.ts + r.tasteNote} className="rounded-xl border-l-4 border-series-live bg-canvas px-4 py-3">
                  <p className="font-medium">
                    <span className="text-gold" aria-label={`${r.rating} of 5 stars`}>{'★'.repeat(r.rating)}</span> {NOTE_LABEL.get(r.tasteNote) ?? r.tasteNote}
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
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              ['Sessions', t.sessions],
              ['Page views', t.pageViews],
              ['Video plays', t.videoPlays],
              ['Shop clicks', t.shopClicks],
            ].map(([label, v]) => (
              <div key={label}>
                <dt className="text-xs text-ink-tertiary">{label}</dt>
                <dd className="font-display text-2xl font-extrabold tracking-tight tabular-nums">{fmt(v as number)}</dd>
              </div>
            ))}
          </dl>
          <Spark days={w.byDay.map((d) => ({ live: 0, synthetic: d.sessions, label: d.key }))} title="Sessions per day, last 60 days" />
          <p className="text-xs text-ink-tertiary">Mock website connector. Videos stay on fairafric’s own site.</p>
        </>
      )}
    </Panel>
  )
}
