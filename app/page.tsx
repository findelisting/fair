import Link from 'next/link'
import { DataBadge } from '@/components/DataBadge'
import { HypothesisLabel } from '@/components/HypothesisLabel'

// Demo landing page. The dashboard link leads to the password gate, which
// returns the visitor to /dashboard after sign-in.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-green">Finde × fairafric</p>
      <h1 className="font-display text-4xl font-bold leading-tight">
        From the QR code on the pack to the customer&apos;s voice.
      </h1>
      <p className="text-ink-secondary">
        This is a demo prototype. It shows how a scan on the packaging leads to a product page,
        how scans and feedback are recorded per SKU and campaign, and how a product agent
        answers questions across the data, with sources.
      </p>
      <div className="flex flex-wrap gap-2" aria-label="Data labels used in this demo">
        <DataBadge kind="live" />
        <DataBadge kind="synthetic" />
        <HypothesisLabel />
      </div>
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-green px-4 py-2 font-semibold text-white hover:bg-green-deep"
        >
          Open the dashboard
        </Link>
        <p className="mt-2 text-sm text-ink-secondary">The dashboard asks for the demo password.</p>
      </div>
    </main>
  )
}
