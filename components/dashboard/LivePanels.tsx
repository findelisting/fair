'use client'

import { useEffect, useState } from 'react'
import { BarChart3, ChevronDown, Eye, Globe, MessageSquare, Route } from 'lucide-react'
import { DataBadge } from '@/components/DataBadge'
import { EmptyState } from '@/components/EmptyState'
import { EvidenceTag } from '@/components/EvidenceTag'
import { PANEL_EVIDENCE, type EvidenceKind, type LivePanelId } from '@/lib/evidence'
import {
  agoText,
  badgeKind,
  breakdownsToShow,
  campaignName,
  headlineNumbers,
  journeySteps,
  marketName,
  skuName,
  starFills,
  sumSplits,
  type DashboardSummary,
} from '@/lib/dashboard'
import { skusInCollection } from '@/lib/catalog'
import { THEME_EXAMPLES } from '@/lib/synthetic'
import { TASTE_NOTES, type Theme } from '@/lib/themes'
import { DataTable, DayColumns, HBars, dayLabel } from './Charts'
import { useLive } from './DashboardLive'
import { useAnimatedNumber, useMounted, useReducedMotion } from './motion'

// Number cards for the dashboard rows (ADR 0012). Each reads the shared live state, so the 5-second
// refresh updates them in place: values that did not change do not move.

const fmt = (n: number) => n.toLocaleString('en-GB')

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Berlin' })
}

/** "29 Sep to 27 Nov", the 60-day window behind every number. */
function windowText(asOf: string): string {
  const end = new Date(asOf)
  const start = new Date(end.getTime() - 60 * 86_400_000)
  const key = (d: Date) => d.toISOString().slice(0, 10)
  return `${dayLabel(key(start))} to ${dayLabel(key(end))}`
}

/** A number that counts up on first load and tweens on change. data-value holds the final value. */
function Num({ value, className = '', testId }: { value: number; className?: string; testId?: string }) {
  const { shown, rose } = useAnimatedNumber(value)
  return (
    <span data-testid={testId} data-value={value} className={`tabular-nums ${rose ? 'num-up' : ''} ${className}`}>
      {fmt(shown)}
    </span>
  )
}

/** Card shell: title, one evidence icon next to it, the Live / Synthetic badge, a progress line while filters load. */
function Card({
  id,
  title,
  icon,
  evidence,
  kind,
  children,
  ping = 0,
}: {
  id: LivePanelId
  title: string
  icon: React.ReactNode
  evidence?: EvidenceKind
  kind: ReturnType<typeof badgeKind>
  children: React.ReactNode
  ping?: number
}) {
  const { pending } = useLive()
  return (
    <section data-testid={id} className="relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-surface p-5 ring-1 ring-line md:p-6">
      {pending && <span aria-hidden className="progress-line absolute inset-x-0 top-0 h-0.5" />}
      {ping > 0 && <span key={ping} aria-hidden className="card-ping pointer-events-none absolute inset-0 rounded-2xl" />}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          {icon}
          {title}
          <EvidenceTag kind={evidence ?? PANEL_EVIDENCE[id]} />
        </h2>
        <DataBadge kind={kind} />
      </header>
      {children}
    </section>
  )
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <span className="skeleton h-9 w-28 rounded-lg" />
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skeleton h-3 rounded" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  )
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="fade-in">
      <EmptyState hint={hint} />
    </div>
  )
}

// ---------- Live status line (spec 3.4) ----------

/** "Live · last scan 12 s ago" or "Waiting for a scan"; a new scan expands into one line for a few seconds. */
export function LiveStatus() {
  const { data, event } = useLive()
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  const lastLive = data?.scans.lastLive ?? null
  return (
    <section data-testid="live-activity" aria-label="Live activity" className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="flex items-center gap-2 text-ink-secondary">
        <span aria-hidden className={`h-2 w-2 rounded-full ${lastLive ? 'bg-series-live' : 'bg-ink-tertiary/50'}`} />
        {lastLive && now ? (
          <span>
            <span className="font-semibold text-green-deep">Live</span> · last scan {agoText(lastLive, now)}
          </span>
        ) : (
          <span>Waiting for a scan. Scan a code and it shows here within 10 seconds.</span>
        )}
      </span>
      {/* Announced politely, and only for a new live scan or answer, never for a plain refresh. */}
      <div aria-live="polite" className="contents">
        {event && (
          <span
            key={event.id}
            data-testid="live-event"
            className="rise-in inline-flex items-center gap-2 rounded-full bg-green/10 px-3 py-1 font-semibold text-green-deep ring-1 ring-inset ring-green/30"
          >
            <span className="tabular-nums">{timeOf(event.at)}</span>
            <span>{event.text}</span>
          </span>
        )}
      </div>
    </section>
  )
}

// ---------- Overview: KPI cards and journey (spec 3.2, 4.3 item 8) ----------

const KPI_NOTES: Record<string, string> = {
  scans: 'Every code scan, bots left out',
  visits: 'Product, collection and feedback pages',
  shop: 'Mock website connector',
  feedback: 'Answers on the feedback form',
}

export function Overview() {
  const { data, pending, pulse } = useLive()
  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <Skeleton lines={1} />
          </div>
        ))}
      </div>
    )
  }
  const range = windowText(data.asOf)
  return (
    <div className="flex flex-col gap-4">
      <section data-testid="headline" aria-label="Headline numbers" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {headlineNumbers(data).map((h) => (
          <div
            key={h.id}
            data-testid="headline-tile"
            data-kind={h.kind}
            title={`${fmt(h.value)} ${h.label.toLowerCase()}, ${range}`}
            className="relative flex flex-col gap-1 overflow-hidden rounded-2xl bg-surface p-4 ring-1 ring-line"
          >
            {pending && <span aria-hidden className="progress-line absolute inset-x-0 top-0 h-0.5" />}
            {h.id === 'scans' && pulse > 0 && <span key={pulse} aria-hidden className="card-ping pointer-events-none absolute inset-0 rounded-2xl" />}
            <span className="flex items-center gap-1 text-sm font-medium text-ink-secondary">
              {h.label}
              <EvidenceTag kind={h.evidence} />
            </span>
            <Num value={h.value} className="font-display text-3xl font-extrabold tracking-tight md:text-4xl" />
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-tertiary">
              <DataBadge kind={h.kind} />
              <span>{KPI_NOTES[h.id]}</span>
            </span>
          </div>
        ))}
      </section>
      <Journey data={data} />
    </div>
  )
}

/** QR scan, product page, feedback, shop click: widths proportional to the counts, no conversion rates (ADR 0012). */
function Journey({ data }: { data: DashboardSummary }) {
  const mounted = useMounted()
  const reduced = useReducedMotion()
  const steps = journeySteps(data)
  return (
    <section data-testid="journey" aria-labelledby="journey-title" className="rounded-2xl bg-surface p-5 ring-1 ring-line md:p-6">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="journey-title" className="flex items-center gap-2 font-display text-base font-bold">
          <Route aria-hidden className="h-4 w-4 text-green" />
          From pack to shop
        </h2>
        <p className="text-xs text-ink-tertiary">Count per step, last 60 days. The steps mix sources, so no rates are shown.</p>
      </header>
      <ol className="flex flex-col">
        {steps.map((s, i) => (
          <li key={s.id} data-testid="journey-step" className="flex flex-col">
            {i > 0 && (
              <span aria-hidden className="ml-3 h-3 w-px bg-line">
                <span className="draw-line block h-full w-px bg-ink-tertiary/60" style={{ '--i': i } as React.CSSProperties} />
              </span>
            )}
            <div className="grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-center gap-3">
              <span className="flex flex-wrap items-center gap-1 text-sm font-medium">
                {s.label}
                <EvidenceTag kind={s.evidence} />
              </span>
              <span className="h-3 rounded-full bg-canvas">
                <span
                  className={`grow-row block h-full rounded-full ${s.kind === 'synthetic' ? 'mark-synthetic' : s.kind === 'live' ? 'bg-series-live' : 'bg-green'}`}
                  style={{ width: mounted ? `${Math.max(s.share * 100, s.value > 0 ? 1 : 0)}%` : '0%', transitionDelay: reduced ? '0ms' : `${i * 150}ms` }}
                />
              </span>
              <span className="flex items-center gap-2">
                <Num value={s.value} className="w-16 text-right font-display text-lg font-bold" />
                <DataBadge kind={s.kind} className="hidden sm:inline-flex" />
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------- Scans and website (row 2) ----------

export function ScansCard() {
  const { data, view, collectionId, query, pulse } = useLive()
  const s = data?.scans
  const total = s ? s.total.live + s.total.synthetic : 0
  const q = new URLSearchParams(query)
  const show = breakdownsToShow({ market: q.get('market') || null, campaign: q.get('campaign') || null })
  const bySku = s
    ? collectionId
      ? skusInCollection(collectionId).map((sku) => s.bySku.find((r) => r.key === sku.id) ?? { key: sku.id, live: 0, synthetic: 0 })
      : s.bySku
    : []
  return (
    <Card id="panel-scans" title="QR scans" icon={<BarChart3 aria-hidden className="h-4 w-4 text-green" />} kind={badgeKind(s?.total ?? { live: 0, synthetic: 0 })} ping={pulse}>
      {!data ? (
        <Skeleton />
      ) : !s || total === 0 ? (
        <Empty hint="No scans in this selection yet." />
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-2">
            <Num testId="scan-total" value={total} className="font-display text-4xl font-extrabold tracking-tight" />
            <span className="text-xs text-ink-secondary">
              last 60 days · <span data-testid="scan-live">{fmt(s.total.live)}</span> live
            </span>
          </p>
          <DayColumns days={s.byDay} title="Scans per day, last 60 days" unit="scans" />
          {show.campaign && (
            <>
              <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">By campaign</h3>
              <HBars rows={s.byCampaign} label={campaignName} title="Scans by campaign" />
            </>
          )}
          {show.market && (
            <>
              <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">By market</h3>
              <HBars rows={s.byMarket} label={marketName} title="Scans by market" />
            </>
          )}
          {view === 'collection' && (
            <>
              <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">By bar</h3>
              <HBars
                rows={[...bySku, { key: 'collection code', ...s.collectionCode }]}
                label={(k) => (k === 'collection code' ? 'Collection code, no bar chosen' : skuName(k))}
                title="Scans by bar"
              />
            </>
          )}
        </>
      )}
    </Card>
  )
}

export function WebCard() {
  const { data } = useLive()
  const w = data?.web
  const t = w?.total
  return (
    <Card id="panel-web" title="Website metrics" icon={<Globe aria-hidden className="h-4 w-4 text-green" />} kind="synthetic">
      {!data ? (
        <Skeleton />
      ) : !t || t.sessions === 0 ? (
        <Empty hint="No website data in this selection." />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {(
              [
                ['Sessions', t.sessions],
                ['Page views', t.pageViews],
                ['Video plays', t.videoPlays],
                ['Shop clicks', t.shopClicks],
              ] as const
            ).map(([label, v]) => (
              <div key={label}>
                <dt className="text-xs text-ink-tertiary">{label}</dt>
                <dd>
                  <Num value={v} className="font-display text-2xl font-extrabold tracking-tight" />
                </dd>
              </div>
            ))}
          </dl>
          <DayColumns days={w!.byDay.map((d) => ({ key: d.key, live: 0, synthetic: d.sessions }))} title="Sessions per day, last 60 days" unit="sessions" />
          <p className="text-xs text-ink-tertiary">Mock website connector. Videos stay on fairafric’s own site.</p>
        </>
      )}
    </Card>
  )
}

// ---------- Feedback and page views (row 3) ----------

const PAGE_LABELS: Record<string, string> = { product: 'Product page', feedback: 'Feedback page', collection: 'Collection page' }

export function PageViewsCard() {
  const { data } = useLive()
  const rows = data?.pageViews.byPage ?? []
  const split = sumSplits(rows)
  return (
    <Card id="panel-page-views" title="Page views" icon={<Eye aria-hidden className="h-4 w-4 text-green" />} kind={badgeKind(split)}>
      {!data ? (
        <Skeleton />
      ) : split.live + split.synthetic === 0 ? (
        <Empty hint="No page views in this selection yet." />
      ) : (
        <>
          <HBars rows={rows} label={(k) => PAGE_LABELS[k] ?? k} title="Page views by page" />
          <DataTable
            caption="Page views by page"
            head={['Page', 'Live', 'Synthetic', 'Total']}
            rows={rows.map((r) => [PAGE_LABELS[r.key] ?? r.key, fmt(r.live), fmt(r.synthetic), fmt(r.live + r.synthetic)])}
          />
        </>
      )}
    </Card>
  )
}

const NOTE_LABEL = new Map(TASTE_NOTES.map((n) => [n.value, n.label]))
const RECENT_VISIBLE = 3

/** Five stars filled to the average, to one decimal place, left to right 60 ms apart. */
function Stars({ avg }: { avg: number }) {
  const mounted = useMounted()
  const reduced = useReducedMotion()
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {starFills(avg).map((f, i) => (
        <span key={i} className="relative inline-block h-4 w-4 text-line">
          <StarShape />
          <span
            className="absolute inset-y-0 left-0 overflow-hidden text-gold transition-[width] duration-300"
            style={{ width: mounted ? `${f * 100}%` : '0%', transitionDelay: reduced ? '0ms' : `${i * 60}ms` }}
          >
            <span className="block h-4 w-4">
              <StarShape />
            </span>
          </span>
        </span>
      ))}
    </span>
  )
}

function StarShape() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
      <path d="M10 1.5l2.6 5.5 6 .7-4.5 4.1 1.2 5.9L10 14.8l-5.3 2.9 1.2-5.9L1.4 7.7l6-.7z" />
    </svg>
  )
}

export function FeedbackCard() {
  const { data } = useLive()
  const f = data?.feedback
  const total = f ? f.total.live + f.total.synthetic : 0
  const [open, setOpen] = useState<string | null>(null)
  const [more, setMore] = useState(false)
  const mounted = useMounted()
  const reduced = useReducedMotion()
  const max = Math.max(1, ...(f?.themes ?? []).map((t) => t.live + t.synthetic))
  return (
    <Card id="panel-feedback" title="Feedback" icon={<MessageSquare aria-hidden className="h-4 w-4 text-green" />} kind={badgeKind(f?.total ?? { live: 0, synthetic: 0 })}>
      {!data ? (
        <Skeleton />
      ) : !f || total === 0 ? (
        <Empty hint="No feedback in this selection yet." />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="flex items-baseline gap-2 text-sm">
              <Num value={total} className="font-display text-4xl font-extrabold tracking-tight" /> answers
            </p>
            {f.avgRating !== null && (
              <p className="flex items-center gap-2 text-sm text-ink-secondary">
                <span className="font-display text-2xl font-bold tabular-nums text-ink">{f.avgRating}</span>
                <Stars avg={f.avgRating} />
                <span>average rating {f.avgRating} / 5</span>
              </p>
            )}
          </div>

          <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Themes · select one for an example</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {f.themes.map((t, i) => {
              const isOpen = open === t.key
              const example = THEME_EXAMPLES[t.key as Theme]
              return (
                <li key={t.key}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : t.key)}
                    title={`${t.key}: ${fmt(t.live)} live, ${fmt(t.synthetic)} synthetic`}
                    className="grid min-h-9 w-full grid-cols-[minmax(6rem,10rem)_1fr_3.5rem] items-center gap-3 rounded-md text-left hover:bg-canvas/70"
                  >
                    <span className="flex items-center gap-1 text-ink-secondary">
                      <ChevronDown aria-hidden className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      {t.key}
                    </span>
                    <span className="flex h-3 gap-0.5" aria-hidden>
                      {t.live > 0 && <span className="grow-row rounded-r-[4px] bg-series-live" style={{ width: mounted ? `${(t.live / max) * 100}%` : '0%', transitionDelay: reduced ? '0ms' : `${Math.min(i, 6) * 40}ms` }} />}
                      {t.synthetic > 0 && (
                        <span className="grow-row mark-synthetic rounded-r-[4px]" style={{ width: mounted ? `${(t.synthetic / max) * 100}%` : '0%', transitionDelay: reduced ? '0ms' : `${Math.min(i, 6) * 40}ms` }} />
                      )}
                    </span>
                    <span className="text-right font-medium tabular-nums text-ink">{fmt(t.live + t.synthetic)}</span>
                  </button>
                  <div className="expand" data-open={isOpen}>
                    <div>
                      {example && (
                        <p className="mx-1 my-2 rounded-xl border-l-4 border-series-synthetic bg-synthetic-surface px-4 py-3 text-sm italic text-ink-secondary">
                          “{example}” <span className="mt-1 block text-xs font-semibold not-italic text-synthetic">Synthetic example</span>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Latest live answers</h3>
          {f.recent.length === 0 ? (
            <p className="text-xs text-ink-tertiary">No live answers yet. Scan a feedback code to add one.</p>
          ) : (
            <>
              <ul data-testid="recent-feedback" className="flex flex-col gap-2 text-sm">
                {(more ? f.recent : f.recent.slice(0, RECENT_VISIBLE)).map((r) => (
                  <li key={r.ts + r.tasteNote} className="rounded-xl border-l-4 border-series-live bg-canvas px-4 py-3">
                    <p className="font-medium">
                      <span className="text-gold" aria-label={`${r.rating} of 5 stars`}>
                        {'★'.repeat(r.rating)}
                      </span>{' '}
                      {NOTE_LABEL.get(r.tasteNote) ?? r.tasteNote}
                    </p>
                    {r.freeText && <p className="text-ink-secondary">{r.freeText}</p>}
                    <p className="text-ink-tertiary">
                      {skuName(r.sku)} · {r.campaign ? campaignName(r.campaign) : 'No campaign'} · {r.market ? marketName(r.market) : 'No market'}
                    </p>
                  </li>
                ))}
              </ul>
              {f.recent.length > RECENT_VISIBLE && (
                <button type="button" onClick={() => setMore((m) => !m)} className="min-h-9 self-start text-sm font-semibold text-green-deep underline-offset-4 hover:underline">
                  {more ? 'Show fewer' : `Show more (${f.recent.length - RECENT_VISIBLE})`}
                </button>
              )}
            </>
          )}
        </>
      )}
    </Card>
  )
}
