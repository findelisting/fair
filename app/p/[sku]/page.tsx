import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MessageSquareHeart, ShieldCheck } from 'lucide-react'
import { BrandLink } from '@/components/BrandLink'
import { DemoButton } from '@/components/DemoButton'
import { LogoSlot } from '@/components/LogoSlot'
import { ProductImage, toneFor } from '@/components/ProductImage'
import { brandLinksFor } from '@/lib/brandLinks'
import { skuById } from '@/lib/catalog'
import { storyFor } from '@/lib/productStory'
import { cleanParams, linkQuery } from '@/lib/params'
import { trackPageView } from '@/lib/recordPageView'

// Product page (ADR 0003). Content from the static catalogue; the page never waits for the database.
// Shopper look: cocoa hero, cream body (design pass 2026-11-26).
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

  const links = brandLinksFor(sku.id)
  const story = storyFor(sku.id)
  const feedbackHref = `/f/${sku.id}?${linkQuery({ sku: sku.id }, p)}`
  return (
    <main id="main" className="min-h-[calc(100dvh-36px)] [--focus-ring:var(--color-caramel)] bg-cream text-cocoa">
      <section className="cocoa-grain text-cream">
        <div className="mx-auto grid max-w-5xl items-center gap-6 px-5 pb-10 pt-8 md:grid-cols-[1.1fr_1fr] md:gap-12 md:py-16">
          <ProductImage label={sku.name} tone={toneFor(sku.id)} className="rise-in h-auto w-full max-w-md justify-self-center" />
          <header className="flex flex-col items-start gap-3">
            <LogoSlot />
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">{sku.name}</h1>
            <p className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-cocoa-raised px-3 py-1 ring-1 ring-inset ring-cocoa-line">{sku.variety}</span>
              <span className="rounded-full bg-cocoa-raised px-3 py-1 ring-1 ring-inset ring-cocoa-line">{sku.format}</span>
            </p>
          </header>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-8 md:grid-cols-[1.1fr_1fr] md:gap-12 md:py-12">
        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            About this bar
            <span className="rounded-full bg-cream-deep px-2 py-0.5 font-body text-xs font-semibold text-ink-secondary">Demo content</span>
          </h2>
          {story ? (
            <>
              <p data-testid="product-story" className="text-lg leading-relaxed text-ink">
                {story.story}
              </p>
              <h3 className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary">How it tastes</h3>
              <ul className="flex flex-wrap gap-2" aria-label="Tasting notes">
                {story.tasting.map((t) => (
                  <li key={t} className="rounded-full bg-surface px-3 py-1 text-sm font-medium ring-1 ring-inset ring-cream-deep">
                    {t}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-tertiary">Demo text. In a pilot, fairafric writes this story.</p>
            </>
          ) : (
            <p className="text-ink-secondary">In a pilot, fairafric&apos;s own story for this bar goes here.</p>
          )}
          <p className="mt-2 flex items-start gap-2 text-sm text-ink-secondary">
            <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-caramel-deep" />
            This page sets no tracking cookies. Feedback is anonymous.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Plain <a>, never next/link: no prefetch, so no fake feedback-page views (ADR 0003, decision 4). */}
          <a
            href={feedbackHref}
            className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-cocoa px-5 py-3 text-base font-semibold text-cream transition-colors hover:bg-cocoa-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel"
          >
            <MessageSquareHeart aria-hidden className="h-5 w-5 text-caramel" />
            Give feedback
          </a>
          {links.shop ? (
            <BrandLink href={links.shop} label="Shop" note="Opens fairafric's own shop." highlight={intentShop} />
          ) : (
            <DemoButton label="Shop" note="Demo: links to the brand's own shop in the pilot." highlight={intentShop} />
          )}
          {links.story ? (
            <BrandLink href={links.story} label="Watch the story" note="Opens fairafric's video on YouTube." />
          ) : (
            <DemoButton label="Watch the story" note="Demo: the video stays on the brand's own site." />
          )}
        </div>
      </div>
    </main>
  )
}
