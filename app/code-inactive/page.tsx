import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Code not active | Finde demo',
}

// Minimal page for unknown, invalid or switched-off QR codes (ADR 0002). Slice 3 styles it.
export default function CodeInactive() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">This code is not active.</h1>
      <p className="text-ink-secondary">
        The QR code you scanned is not, or no longer, linked to a product page in this demo.
      </p>
    </main>
  )
}
