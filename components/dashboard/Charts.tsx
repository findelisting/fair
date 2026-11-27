'use client'

import { useEffect, useId, useState } from 'react'
import { useMounted, useReducedMotion } from './motion'

// Charts for the dashboard (ADR 0012, spec 3.3 and 4.3). HTML bars, so heights and widths can transition:
// bars grow from zero on first paint, later data changes move from the old shape. Axes start at zero.
// Each chart has a summary sentence for screen readers and a data table toggle.

const fmt = (n: number) => n.toLocaleString('en-GB')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "2026-11-27" to "27 Nov". */
export function dayLabel(key: string): string {
  const [, m, d] = key.split('-').map(Number)
  return m && d ? `${d} ${MONTHS[m - 1]}` : key
}

/** True for about one second after mount: the first draw uses a stagger, later changes do not. */
function useFirstDraw(): boolean {
  const [first, setFirst] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setFirst(false), 1000)
    return () => clearTimeout(t)
  }, [])
  return first
}

export interface Day {
  key: string
  live: number
  synthetic: number
}

/** Columns per day: synthetic striped at the base, live solid on top. Hover or arrow keys show a day's numbers. */
export function DayColumns({ days, title, unit }: { days: Day[]; title: string; unit: string }) {
  const mounted = useMounted()
  const first = useFirstDraw()
  const reduced = useReducedMotion()
  const [active, setActive] = useState<number | null>(null)
  const tipId = useId()
  const max = Math.max(1, ...days.map((d) => d.live + d.synthetic))
  const total = days.reduce((n, d) => n + d.live + d.synthetic, 0)
  const peak = days.reduce((b, d, i) => (d.live + d.synthetic > days[b].live + days[b].synthetic ? i : b), 0)
  const hasLive = days.some((d) => d.live > 0)
  const a = active !== null ? days[active] : null

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const step = e.key === 'ArrowRight' ? 1 : -1
      setActive((i) => Math.min(days.length - 1, Math.max(0, (i ?? (step > 0 ? -1 : days.length)) + step)))
    } else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(days.length - 1)
    else if (e.key === 'Escape') setActive(null)
  }

  if (days.length === 0) return null
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="sr-only">
        {title}: {fmt(total)} {unit} in total, highest on {dayLabel(days[peak].key)} with {fmt(days[peak].live + days[peak].synthetic)}. Use the arrow keys to read each day.
      </figcaption>
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        {/* Y axis: zero and the maximum, so the scale can be read at a glance. */}
        <div aria-hidden className="flex h-[180px] flex-col justify-between text-right text-[11px] tabular-nums text-ink-tertiary sm:h-36">
          <span>{fmt(max)}</span>
          <span>0</span>
        </div>
        <div
          role="group"
          tabIndex={0}
          aria-label={`${title}. ${a ? `${dayLabel(a.key)}: ${fmt(a.live + a.synthetic)} ${unit}, ${fmt(a.live)} live, ${fmt(a.synthetic)} synthetic.` : 'Use the arrow keys to read each day.'}`}
          aria-describedby={a ? tipId : undefined}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onMouseLeave={() => setActive(null)}
          className="relative flex h-[180px] items-end gap-px border-b border-line sm:h-36"
        >
          {days.map((d, i) => {
            const hl = ((d.live / max) * 100).toFixed(2)
            const hs = ((d.synthetic / max) * 100).toFixed(2)
            const delay = first && !reduced ? `${Math.min(i, 30) * 15}ms` : '0ms'
            const dim = active !== null && active !== i
            return (
              <div
                key={d.key}
                onMouseEnter={() => setActive(i)}
                className={`flex h-full flex-1 flex-col justify-end transition-opacity duration-150 ${dim ? 'opacity-50' : 'opacity-100'}`}
              >
                {d.live > 0 && <div className="grow-col rounded-t-[2px] bg-series-live" style={{ height: mounted ? `${hl}%` : '0%', transitionDelay: delay }} />}
                {d.synthetic > 0 && (
                  <div className={`grow-col mark-synthetic ${d.live > 0 ? '' : 'rounded-t-[2px]'}`} style={{ height: mounted ? `${hs}%` : '0%', transitionDelay: delay }} />
                )}
              </div>
            )
          })}
          {a && active !== null && (
            <div
              id={tipId}
              role="tooltip"
              className="pop-in pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-night px-3 py-2 text-xs text-ivory shadow-lg [animation-delay:100ms]"
              style={{ left: `clamp(4.5rem, ${((active + 0.5) / days.length) * 100}%, calc(100% - 4.5rem))` }}
            >
              <span className="block font-semibold">{dayLabel(a.key)}</span>
              <span className="tabular-nums">
                {fmt(a.live + a.synthetic)} {unit}
                {hasLive || a.live > 0 ? ` · ${fmt(a.live)} live, ${fmt(a.synthetic)} synthetic` : ' · synthetic'}
              </span>
            </div>
          )}
        </div>
        <span />
        <div aria-hidden className="mt-1 flex justify-between text-[11px] text-ink-tertiary">
          <span>{dayLabel(days[0].key)}</span>
          <span>{dayLabel(days[days.length - 1].key)}</span>
        </div>
      </div>
      <DataTable
        caption={title}
        head={['Day', 'Live', 'Synthetic', 'Total']}
        rows={days.map((d) => [dayLabel(d.key), fmt(d.live), fmt(d.synthetic), fmt(d.live + d.synthetic)])}
      />
    </figure>
  )
}

export interface Row {
  key: string
  live: number
  synthetic: number
}

/**
 * Horizontal bars, growing from the left (40 ms stagger, capped at 6). Hover or focus darkens one row and
 * drops the others to 50 %. Live solid, synthetic striped.
 */
export function HBars({ rows, label, title }: { rows: Row[]; label: (key: string) => string; title: string }) {
  const mounted = useMounted()
  const first = useFirstDraw()
  const reduced = useReducedMotion()
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(1, ...rows.map((r) => r.live + r.synthetic))
  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1.5 text-sm" aria-label={title} onMouseLeave={() => setActive(null)}>
        {rows.map((r, i) => {
          const name = label(r.key)
          const delay = first && !reduced ? `${Math.min(i, 6) * 40}ms` : '0ms'
          const dim = active !== null && active !== r.key
          return (
            <li
              key={r.key}
              tabIndex={0}
              aria-label={`${name}: ${fmt(r.live + r.synthetic)}, ${fmt(r.live)} live, ${fmt(r.synthetic)} synthetic`}
              title={`${name}: ${fmt(r.live)} live, ${fmt(r.synthetic)} synthetic`}
              onMouseEnter={() => setActive(r.key)}
              onFocus={() => setActive(r.key)}
              onBlur={() => setActive(null)}
              className={`grid grid-cols-[minmax(6rem,10rem)_1fr_3.5rem] items-center gap-3 rounded-md py-0.5 transition-opacity duration-150 ${dim ? 'opacity-50' : 'opacity-100'}`}
            >
              <span className="line-clamp-2 leading-tight text-ink-secondary">{name}</span>
              <span className="flex h-3 gap-0.5" aria-hidden>
                {r.live > 0 && (
                  <span className="grow-row rounded-l-sm rounded-r-[4px] bg-series-live" style={{ width: mounted ? `${(r.live / max) * 100}%` : '0%', transitionDelay: delay }} />
                )}
                {r.synthetic > 0 && (
                  <span className="grow-row mark-synthetic rounded-l-sm rounded-r-[4px]" style={{ width: mounted ? `${(r.synthetic / max) * 100}%` : '0%', transitionDelay: delay }} />
                )}
              </span>
              <span aria-hidden className="text-right font-medium tabular-nums text-ink">
                {fmt(r.live + r.synthetic)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** A data table behind a toggle: the chart's numbers for screen readers and anyone who wants them exact. */
export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <details className="group text-xs">
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 font-semibold text-green-deep underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="transition group-open:rotate-90">
          ›
        </span>
        Data table
      </summary>
      <div className="mt-2 max-h-56 overflow-auto rounded-lg ring-1 ring-line">
        <table className="w-full text-left tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-canvas text-ink-secondary">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-1.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-3 py-1 font-medium">
                      {c}
                    </th>
                  ) : (
                    <td key={i} className="px-3 py-1">
                      {c}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
