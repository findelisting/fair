'use client'

import { useLayoutEffect, useRef } from 'react'

/**
 * A dashboard row that fades up once: on load (staggered by row) or when 15 % of it scrolls into view.
 * It never replays on scroll back (spec 4.2).
 */
export function Reveal({ id, index, className = '', children, label }: { id: string; index: number; className?: string; children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.dataset.shown = 'false'
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.shown = 'true'
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section ref={ref} id={id} aria-label={label} className={`reveal scroll-mt-40 ${className}`} style={{ '--i': index } as React.CSSProperties}>
      {children}
    </section>
  )
}
