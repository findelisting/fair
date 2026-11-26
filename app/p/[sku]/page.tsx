import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DemoButton } from '@/components/DemoButton'
import { ProductImage } from '@/components/ProductImage'
import { skuById } from '@/lib/catalog'
import { cleanParams, linkQuery } from '@/lib/params'
import { trackPageView } from '@/lib/recordPageView'

// Product page (ADR 0003). Content from the static catalogue; the page never waits for the database.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ sku: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sku = skuById((await params).sku)
  return { title: sku ? `${sku.name} | fairafric demo` : 'Not found' }
}

export default async function ProductPage({ params, searchParams }: Props) {
  const sku = skuById((await params).sku)
  if (!sku || sku.status !== 'active') notFound()
  const sp = await searchParams
  const p = cleanParams(sp)
  const intentShop = sp.intent === 'shop'

  await trackPageView({ page: 'product', sku_id: sku.id, campaign_id: p.campaign, market: p.market })

  const feedbackHref = `/f/${sku.id}?${linkQuery({ sku: sku.id }, p)}`
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 py-8">
      <ProductImage label={sku.name} tone={sku.id.startsWith('dark') ? 'dark' : 'creamy'} />
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-green">fairafric</p>
        <h1 className="font-display text-3xl font-bold leading-tight">{sku.name}</h1>
        <p className="text-ink-secondary">
          <span>{sku.variety}</span> · <span>{sku.format}</span>
        </p>
      </header>
      <p className="text-ink-secondary">{sku.description}</p>

      <div className="flex flex-col gap-4">
        {/* Plain <a>, never next/link: no prefetch, so no fake feedback-page views (ADR 0003, decision 4). */}
        <a
          href={feedbackHref}
          className="flex min-h-12 items-center justify-center rounded-xl bg-green px-4 py-3 text-base font-semibold text-ivory"
        >
          Give feedback
        </a>
        <DemoButton label="Shop" note="Demo: links to the brand's own shop in the pilot." highlight={intentShop} />
        <DemoButton label="Watch the story" note="Demo: the video stays on the brand's own site." />
      </div>
    </main>
  )
}
