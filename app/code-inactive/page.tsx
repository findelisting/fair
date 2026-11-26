import type { Metadata } from 'next'
import { QrCode } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Code not active | Finde demo',
}

// Shown for unknown, invalid or switched-off QR codes (ADR 0002). Not counted as a page view.
export default function CodeInactive() {
  return (
    <main id="main" className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <QrCode aria-hidden className="h-10 w-10 text-ink-tertiary" />
      <h1 className="font-display text-2xl font-bold">This code is not active.</h1>
      <p className="text-ink-secondary">
        The QR code you scanned is not, or no longer, linked to a product page in this demo.
      </p>
    </main>
  )
}
