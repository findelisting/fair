import { notFound } from 'next/navigation'
import { CompetitorPanel } from '@/components/CompetitorPanel'
import { HypothesesPanel } from '@/components/HypothesesPanel'

// Temporary, dev-only preview of the slice 7 panels (ADR 0001).
// Delete in slice 4, when the panels move onto the dashboard.
export const dynamic = 'force-dynamic'

export default function InsightsPreview() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-green">Preview (dev only)</p>
      <CompetitorPanel />
      <HypothesesPanel />
    </main>
  )
}
