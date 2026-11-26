'use client'

import { Printer } from 'lucide-react'

/** Screen-only print button (Q-7). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-green px-3 py-2 text-sm font-semibold text-white print:hidden"
    >
      <Printer aria-hidden className="h-4 w-4" /> Print sheet
    </button>
  )
}
