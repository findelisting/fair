import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { BrandLink } from '@/components/BrandLink'
import { DemoButton } from '@/components/DemoButton'
import { brandLinksFor } from '@/lib/brandLinks'
import { skuById } from '@/lib/catalog'
import { cleanParams, linkQuery } from '@/lib/params'

// Thank-you page after feedback. Not counted as a page view (spec section 3.4).
// Offers the next step (shop, story) instead of a dead end (ADR 0011).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Thank you | fairafric demo' }

type Props = {
  params: Promise<{ sku: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ThanksPage({ params, searchParams }: Props) {
  const sku = skuById((await params).sku)
  if (!sku) notFound()
  const p = cleanParams(await searchParams)
  const links = brandLinksFor(sku.id)
  return (
    <main id="main" className="min-h-[calc(100dvh-36px)] [--focus-ring:var(--color-caramel)] bg-cream px-5 py-16 text-cocoa">
      <div className="rise-in mx-auto flex max-w-md flex-col items-center gap-5 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cocoa text-caramel">
          <Check aria-hidden className="h-8 w-8" strokeWidth={2.5} />
        </span>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Thank you</h1>
        <p className="text-ink-secondary">Your feedback on {sku.name} is saved. It helps fairafric improve this chocolate.</p>
        <div data-testid="thanks-next" className="mt-2 flex w-full flex-col gap-3 text-left">
          {links.shop ? (
            <BrandLink href={links.shop} label="Shop" note="Opens fairafric's own shop." highlight />
          ) : (
            <DemoButton label="Shop" note="Demo: links to the brand's own shop in the pilot." highlight />
          )}
          {links.story ? (
            <BrandLink href={links.story} label="Watch the story" note="Opens fairafric's video on YouTube." />
          ) : (
            <DemoButton label="Watch the story" note="Demo: the video stays on the brand's own site." />
          )}
        </div>
        <a
          href={`/p/${sku.id}?${linkQuery({ sku: sku.id }, p)}`}
          className="flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-base font-semibold text-ink-secondary underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to {sku.name}
        </a>
      </div>
    </main>
  )
}
