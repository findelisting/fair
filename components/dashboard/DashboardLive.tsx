'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState, useTransition } from 'react'
import { campaignName, marketName, newLiveScan, skuName, type DashboardSummary, type View } from '@/lib/dashboard'

// Shared live state for the dashboard (ADR 0012, decision 1). One poll every 5 s feeds the top bar,
// the status line and every number card. A failed poll keeps the last numbers and shows "Reconnecting";
// a 401 sends the browser to sign in. The provider is not remounted when a filter changes: the new
// server summary replaces the old one and the numbers tween from where they were.
const POLL_MS = 5000
const TIMEOUT_MS = 4000
/** How long a new live event stays expanded in the status line. */
const EVENT_MS = 6000
/** At most one live-scan pulse per 3 seconds, however many scans arrive (spec 4.3, item 3). */
const PULSE_GAP_MS = 3000

export interface LiveEvent {
  id: number
  at: string
  kind: 'scan' | 'answer'
  text: string
}

interface LiveState {
  data: DashboardSummary | null
  ok: boolean
  query: string
  view: View
  collectionId?: string
  /** The newest live event, while it is still expanded; null otherwise. */
  event: LiveEvent | null
  /** Goes up by one per (rate-limited) live-scan pulse; 0 until the first one. */
  pulse: number
  /** True while a filter change is loading. */
  pending: boolean
  navigate: (href: string) => void
}

const Ctx = createContext<LiveState | null>(null)

export function useLive(): LiveState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLive outside DashboardLive')
  return v
}

function scanText(s: NonNullable<ReturnType<typeof newLiveScan>>): string {
  const parts = [s.sku ? skuName(s.sku) : null, s.market ? marketName(s.market) : null, s.campaign ? campaignName(s.campaign) : null].filter(Boolean)
  const head = s.count > 1 ? `${s.count} live scans` : 'Live scan'
  return parts.length ? `${head} · ${parts.join(' · ')}` : head
}

function answerText(n: number, r: DashboardSummary['feedback']['recent'][number] | undefined): string {
  const head = n > 1 ? `${n} live feedback answers` : 'Live feedback answer'
  if (!r) return head
  const parts = [skuName(r.sku), r.market ? marketName(r.market) : null, `${r.rating} of 5 stars`].filter(Boolean)
  return `${head} · ${parts.join(' · ')}`
}

interface Props {
  query: string
  view: View
  initial: DashboardSummary | null
  collectionId?: string
  children: React.ReactNode
}

export function DashboardLive({ query, view, initial, collectionId, children }: Props) {
  const [data, setData] = useState<DashboardSummary | null>(initial)
  const [ok, setOk] = useState(initial !== null)
  const [event, setEvent] = useState<LiveEvent | null>(null)
  const [pulse, setPulse] = useState(0)
  const [pending, startTransition] = useTransition()
  const last = useRef<DashboardSummary | null>(initial)
  const lastPulse = useRef(0)
  const eventId = useRef(0)
  const eventTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const router = useRouter()

  // A new server render (filter change, agent question) brings a fresh summary: take it, no count-up.
  const [seen, setSeen] = useState(initial)
  if (seen !== initial) {
    setSeen(initial)
    if (initial) {
      setData(initial)
      setOk(true)
    }
  }
  useEffect(() => {
    if (initial) last.current = initial
  }, [initial])

  useEffect(() => {
    let stopped = false
    const show = (e: LiveEvent) => {
      setEvent(e)
      if (eventTimer.current) clearTimeout(eventTimer.current)
      eventTimer.current = setTimeout(() => setEvent(null), EVENT_MS)
    }
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
        if (stopped) return
        const prev = last.current
        if (prev) {
          const scan = newLiveScan(prev, next)
          const answers = next.feedback.total.live - prev.feedback.total.live
          if (scan) {
            show({ id: ++eventId.current, at: next.asOf, kind: 'scan', text: scanText(scan) })
            const now = Date.now()
            if (now - lastPulse.current >= PULSE_GAP_MS) {
              lastPulse.current = now
              setPulse((p) => p + 1)
            }
          } else if (answers > 0) {
            show({ id: ++eventId.current, at: next.asOf, kind: 'answer', text: answerText(answers, next.feedback.recent[0]) })
          }
        }
        last.current = next
        setData(next)
        setOk(true)
      } catch {
        if (!stopped) setOk(false)
      } finally {
        clearTimeout(timer)
        inFlight.current = false
      }
    }
    const id = setInterval(tick, POLL_MS)
    if (!last.current) void tick()
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [query, router])

  useEffect(() => () => {
    if (eventTimer.current) clearTimeout(eventTimer.current)
  }, [])

  const navigate = (href: string) => startTransition(() => router.push(href, { scroll: false }))

  return (
    <Ctx.Provider value={{ data, ok, query, view, collectionId, event, pulse, pending, navigate }}>{children}</Ctx.Provider>
  )
}
