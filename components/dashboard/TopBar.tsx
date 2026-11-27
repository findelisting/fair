'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Plug, QrCode } from 'lucide-react'
import { useLive } from './DashboardLive'
import { openSources } from './SourcesDrawer'

// Sticky top bar (ADR 0012, decision 2): title, poll status, section links that follow the scroll,
// the Data sources drawer and the QR codes page.

export interface SectionLink {
  id: string
  label: string
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Berlin' })
}

export function TopBar({ sections }: { sections: SectionLink[] }) {
  const { data, ok, pulse } = useLive()
  const [current, setCurrent] = useState(sections[0]?.id)

  // Highlight the section that holds the top part of the screen.
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => e !== null)
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        const first = sections.find((s) => seen.get(s.id))
        if (first) setCurrent(first.id)
      },
      { rootMargin: '-160px 0px -55% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [sections])

  // Keep the active link in view on a phone, where the links scroll sideways.
  useEffect(() => {
    document.querySelector(`[data-section-link="${current}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [current])

  return (
    <div data-testid="top-bar" className="sticky top-9 z-40 -mx-4 border-b border-line bg-canvas/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center justify-between gap-x-4 gap-y-2 pt-2 sm:flex-wrap sm:pt-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Demo guide" title="Demo guide" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-secondary ring-1 ring-inset ring-line hover:bg-surface hover:text-green-deep">
            <ArrowLeft aria-hidden className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-green sm:block">Finde × fairafric</p>
            <h1 className="font-display text-xl font-extrabold leading-tight tracking-tight md:text-2xl">Product performance</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p data-testid="poll-status" className="flex items-center gap-2 text-xs text-ink-secondary">
            <span aria-hidden key={pulse} className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-series-live' : 'bg-amber-500'} ${pulse > 0 ? 'dot-pulse' : ''}`} />
            {ok ? (
              <span>
                <span className="font-semibold text-green-deep">Live</span>
                <span className="hidden sm:inline"> + <span className="font-semibold text-synthetic">synthetic</span></span> · <span className="hidden sm:inline">updated </span>
                <span className="tabular-nums">{data ? timeOf(data.asOf) : ''}</span>
              </span>
            ) : (
              <span role="status">Reconnecting…</span>
            )}
          </p>
          <button
            type="button"
            onClick={openSources}
            data-testid="open-sources"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-green-deep ring-1 ring-inset ring-line transition-colors hover:bg-surface"
          >
            <Plug aria-hidden className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Data sources</span>
          </button>
          <Link href="/dashboard/codes" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-green-deep ring-1 ring-inset ring-line transition-colors hover:bg-surface">
            <QrCode aria-hidden className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">QR codes</span>
          </Link>
        </div>
      </div>
      <nav aria-label="Sections" className="no-scrollbar -mx-1 mt-2 flex gap-1 overflow-x-auto pb-2">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            data-section-link={s.id}
            aria-current={current === s.id ? 'location' : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium transition-colors duration-150 ${current === s.id ? 'bg-green text-white' : 'text-ink-secondary hover:bg-surface'}`}
          >
            {s.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
