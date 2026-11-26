import { FlaskConical } from 'lucide-react'

export const DEMO_BANNER_TEXT = 'Demo prototype, synthetic data'

/** Shown at the top of every page (CLAUDE.md constraints, APPROACH.md section 6). */
export function DemoBanner() {
  return (
    <div
      role="note"
      data-testid="demo-banner"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-night px-4 py-2 text-center text-sm font-medium text-ivory"
    >
      <FlaskConical aria-hidden className="h-4 w-4 shrink-0 text-gold" />
      <span>{DEMO_BANNER_TEXT}</span>
    </div>
  )
}
