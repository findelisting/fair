import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductImage } from '@/components/ProductImage'
import { collectionById, skusInCollection } from '@/lib/catalog'
import { cleanParams, linkQuery } from '@/lib/params'
import { trackPageView } from '@/lib/recordPageView'

// Collection page (ADR 0003). One collection code points to several SKUs.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ collection: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = collectionById((await params).collection)
  return { title: c ? `${c.name} | fairafric demo` : 'Not found' }
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const collection = collectionById((await params).collection)
  if (!collection) notFound()
  const p = cleanParams(await searchParams)
  const skus = skusInCollection(collection.id)

  await trackPageView({ page: 'collection', collection_id: collection.id, campaign_id: p.campaign, market: p.market })

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-green">fairafric</p>
        <h1 className="font-display text-3xl font-bold leading-tight">{collection.name}</h1>
        <p className="text-ink-secondary">Choose a bar to see more and share your feedback.</p>
      </header>
      <ul className="flex flex-col gap-4">
        {skus.map((s) => (
          <li key={s.id}>
            {/* Plain <a>: a full page load, never prefetched (ADR 0003, decision 4). */}
            <a
              href={`/p/${s.id}?${linkQuery({ sku: s.id }, p)}`}
              data-sku={s.id}
              className="flex min-h-12 items-center gap-4 rounded-2xl bg-surface p-3 ring-1 ring-line"
            >
              <div className="w-28 shrink-0">
                <ProductImage label={s.name} tone="creamy" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold">{s.name}</span>
                <span className="text-sm text-ink-secondary">
                  {s.variety} · {s.format}
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
