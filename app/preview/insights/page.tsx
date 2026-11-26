import { notFound } from 'next/navigation'
import { CompetitorPanel } from '@/components/CompetitorPanel'
import { HypothesesPanel } from '@/components/HypothesesPanel'

// Temporary, dev-only preview of the slice 7 cards (ADR 0001), as they will sit in each product view.
// Delete in slice 4, when the cards move onto the dashboard.
export const dynamic = 'force-dynamic'

const SKUS = [
  { id: 'dark-92', name: 'Dark 92%' },
  { id: 'creamy-oat', name: 'Vegan Creamy Oat' },
  { id: 'creamy-hazelnut', name: 'Vegan Creamy Hazelnut' },
]

export default function InsightsPreview() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-green">Preview (dev only)</p>
      {SKUS.map((s) => (
        <section key={s.id} data-testid={`preview-${s.id}`} className="flex flex-col gap-3">
          <h1 className="font-display text-xl font-bold">{s.name}</h1>
          <CompetitorPanel sku={s.id} />
          <HypothesesPanel sku={s.id} />
        </section>
      ))}
    </main>
  )
}
