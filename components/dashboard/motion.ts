'use client'

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

// Motion helpers for the dashboard (ADR 0012, spec section 4). Every helper respects
// prefers-reduced-motion: values still update, they just do not tween.

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(cb: () => void) {
  const m = window.matchMedia(QUERY)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

/** True when the visitor asks for reduced motion. False on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * A whole number that counts up from 0 on first load (600 ms) and, on a later change, tweens from the
 * previous value (250 ms). An unchanged value does nothing. Returns the number to show and whether it just rose.
 */
export function useAnimatedNumber(value: number): { shown: number; rose: boolean } {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(value)
  const [rose, setRose] = useState(false)
  const first = useRef(true)
  const display = useRef(0)
  /** The last value a tween finished on; null until one has. Only a change after that tints. */
  const settled = useRef<number | null>(null)
  const frame = useRef(0)

  // Layout effect: the first count-up starts before paint, so the final number never flashes first.
  useLayoutEffect(() => {
    const start = first.current ? 0 : display.current
    first.current = false
    const finish = () => {
      display.current = value
      settled.current = value
      setShown(value)
    }
    if (start === value) return finish()
    if (settled.current !== null && value > settled.current) setRose(true)
    if (reduced) return finish()
    const duration = settled.current === null ? 600 : 250
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      if (t >= 1) return finish()
      display.current = Math.round(start + (value - start) * easeOut(t))
      setShown(display.current)
      frame.current = requestAnimationFrame(step)
    }
    display.current = start
    setShown(start)
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [value, reduced])

  useEffect(() => {
    if (!rose) return
    const t = setTimeout(() => setRose(false), 800)
    return () => clearTimeout(t)
  }, [rose])

  return { shown, rose }
}

/** False on the server and the first client paint, true right after: lets bars grow from the baseline once. */
export function useMounted(): boolean {
  const [m, setM] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return m
}
