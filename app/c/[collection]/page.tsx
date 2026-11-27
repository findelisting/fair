import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { LogoSlot } from '@/components/LogoSlot'
import { ProductImage, toneFor } from '@/components/ProductImage'
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
    <main id="main" className="min-h-[calc(100dvh-36px)] [--focus-ring:var(--color-caramel)] bg-cream text-cocoa">
      <section className="cocoa-grain text-cream">
        <header className="mx-auto flex max-w-3xl flex-col items-start gap-3 px-5 pb-14 pt-10 md:pb-20 md:pt-16">
          <LogoSlot />
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">{collection.name}</h1>
          <p className="text-cream/75">{skus.length} bars. Pick one to see more and share your feedback.</p>
        </header>
      </section>
      <ul className="mx-auto -mt-8 grid max-w-3xl gap-4 px-5 pb-12 md:grid-cols-2">
        {skus.map((s, i) => (
          <li key={s.id} className="rise-in" style={{ animationDelay: `${i * 60}ms` }}>
            {/* Plain <a>: a full page load, never prefetched (ADR 0003, decision 4). */}
            <a
              href={`/p/${s.id}?${linkQuery({ sku: s.id }, p)}`}
              data-sku={s.id}
              className="group flex h-full flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-cream-deep transition-shadow hover:ring-caramel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel"
            >
              <div className="bg-cream-deep px-8 py-4">
                <ProductImage label={s.name} tone={toneFor(s.id)} />
              </div>
              <div className="flex items-center justify-between gap-3 p-5">
                <div className="flex flex-col">
                  <span className="font-display text-xl font-bold">{s.name}</span>
                  <span className="text-sm text-ink-secondary">
                    {s.variety} · {s.format}
                  </span>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cocoa text-cream transition-transform group-hover:translate-x-0.5">
                  <ChevronRight aria-hidden className="h-5 w-5" />
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
