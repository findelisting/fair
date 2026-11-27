'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { FilterChip, View } from '@/lib/dashboard'
import { useLive } from './DashboardLive'

// Filters (ADR 0012, decision 3): bar, market and campaign apply on change; active filters show as
// removable chips. Without JavaScript the form still submits with the Apply button inside <noscript>.
// On a phone the selects fold into a "Filters" panel with an active-count badge.

export interface Option {
  value: string
  label: string
  /** No scans for the chosen bar: listed, but disabled unless it is the current choice. */
  disabled?: boolean
}

interface Props {
  view: View
  id: string
  market: string | null
  campaign: string | null
  barLabel: string
  bars: Option[]
  markets: Option[]
  campaigns: Option[]
  chips: FilterChip[]
}

export function FilterBar({ view, id, market, campaign, barLabel, bars, markets, campaigns, chips }: Props) {
  const { navigate, pending } = useLive()
  const [open, setOpen] = useState(false)

  const go = (next: { id?: string; market?: string | null; campaign?: string | null }) => {
    const q = new URLSearchParams({ view, id: next.id ?? id })
    const m = next.market === undefined ? market : next.market
    const c = next.campaign === undefined ? campaign : next.campaign
    if (m) q.set('market', m)
    if (c) q.set('campaign', c)
    navigate(`/dashboard?${q.toString()}`)
  }

  const toggle = (v: View, label: string) => (
    <Link
      href={`/dashboard?view=${v}`}
      aria-current={view === v ? 'page' : undefined}
      className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${view === v ? 'bg-green text-white' : 'text-ink-secondary hover:bg-canvas'}`}
    >
      {label}
    </Link>
  )

  return (
    <div data-testid="filter-bar" className="flex flex-col gap-3">
      <form
        method="get"
        action="/dashboard"
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          go({ id: String(f.get('id')), market: String(f.get('market') || '') || null, campaign: String(f.get('campaign') || '') || null })
        }}
        className="flex flex-wrap items-end gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line sm:p-4"
      >
        <input type="hidden" name="view" value={view} />
        <nav className="flex gap-1 rounded-full bg-canvas p-1" aria-label="View">
          {toggle('product', 'One bar')}
          {toggle('collection', 'All bars')}
        </nav>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="filter-fields"
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-green-deep ring-1 ring-inset ring-line sm:hidden"
        >
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          Filters
          {chips.length > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green px-1.5 text-xs text-white">{chips.length}</span>}
        </button>
        <div id="filter-fields" className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-3 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-end`}>
          <Select name="id" label={barLabel} value={id} options={bars} onChange={(v) => go({ id: v })} />
          <Select name="market" label="Market" value={market ?? ''} options={[{ value: '', label: 'All markets' }, ...markets]} onChange={(v) => go({ market: v || null })} />
          <Select name="campaign" label="Campaign" value={campaign ?? ''} options={[{ value: '', label: 'All campaigns' }, ...campaigns]} onChange={(v) => go({ campaign: v || null })} />
          <noscript>
            {/* Without JavaScript the phone toggle cannot open the fields, so show them. */}
            <style>{'#filter-fields{display:flex}'}</style>
            <button type="submit" className="min-h-11 rounded-full bg-green px-5 text-sm font-semibold text-white">
              Apply
            </button>
          </noscript>
        </div>
      </form>
      {chips.length > 0 && (
        <ul data-testid="filter-chips" aria-label="Active filters" className="flex flex-wrap items-center gap-2 text-sm">
          {chips.map((c) => (
            <li key={c.param}>
              <button
                type="button"
                onClick={() => go({ [c.param]: null })}
                aria-label={`Remove filter ${c.label}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-green/10 px-3 font-semibold text-green-deep ring-1 ring-inset ring-green/30 transition-colors duration-150 hover:bg-green/20"
              >
                {c.label}
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => go({ market: null, campaign: null })} className="min-h-9 px-2 font-semibold text-ink-secondary underline underline-offset-4 hover:text-green-deep">
              Clear all
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

function Select({ name, label, value, options, onChange }: { name: string; label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  return (
    <label className="flex w-full flex-col gap-1 text-xs font-medium text-ink-secondary sm:w-auto">
      {label}
      <select
        name={name}
        // Uncontrolled, reset by key when the page brings a new value: the choice shows at once.
        key={value}
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled && o.value !== value}>
            {o.disabled ? `${o.label} (no scans yet)` : o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
