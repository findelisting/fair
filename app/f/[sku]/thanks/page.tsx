import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { skuById } from '@/lib/catalog'
import { cleanParams, linkQuery } from '@/lib/params'

// Thank-you page after feedback. Not counted as a page view (spec section 3.4).
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
  return (
    <main id="main" className="min-h-[calc(100dvh-36px)] [--focus-ring:var(--color-caramel)] bg-cream px-5 py-16 text-cocoa">
      <div className="rise-in mx-auto flex max-w-md flex-col items-center gap-5 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cocoa text-caramel">
          <Check aria-hidden className="h-8 w-8" strokeWidth={2.5} />
        </span>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Thank you</h1>
        <p className="text-ink-secondary">Your feedback on {sku.name} is saved. It helps fairafric improve this chocolate.</p>
        <a
          href={`/p/${sku.id}?${linkQuery({ sku: sku.id }, p)}`}
          className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface px-5 py-3 text-base font-semibold ring-1 ring-inset ring-cream-deep hover:ring-caramel"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to {sku.name}
        </a>
      </div>
    </main>
  )
}
