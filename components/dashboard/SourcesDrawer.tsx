'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Data sources drawer (ADR 0012, spec 1.5 and 4.2): a native modal <dialog>, so focus stays inside,
// Escape closes it and the browser returns focus to the button that opened it. The page does not scroll.

const DRAWER_ID = 'data-sources-drawer'

export function openSources() {
  const d = document.getElementById(DRAWER_ID) as HTMLDialogElement | null
  if (d && !d.open) d.showModal()
}

export function SourcesDrawer({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  return (
    <dialog
      id={DRAWER_ID}
      ref={ref}
      aria-label="Data sources"
      data-testid="sources-drawer"
      // A click on the scrim (the dialog box itself, outside its content) closes it.
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      className="drawer overflow-y-auto bg-canvas p-0 shadow-2xl"
    >
      <div className="flex min-h-full flex-col gap-4 p-4 sm:p-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close data sources"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-secondary ring-1 ring-inset ring-line hover:bg-surface"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

/** A second way in, from the compact list at the bottom of the page. */
export function OpenSourcesButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={openSources} className={className}>
      {children}
    </button>
  )
}

/** A <details> that starts open, and closes itself on a phone (spec 2, row 6: collapsed by default on mobile). */
export function OpenOnWide({ children, className, testId }: { children: React.ReactNode; className?: string; testId?: string }) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (ref.current && window.matchMedia('(max-width: 639px)').matches) ref.current.open = false
  }, [])
  return (
    <details ref={ref} open data-testid={testId} className={className}>
      {children}
    </details>
  )
}
