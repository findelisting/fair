import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 py-16 text-center">
      <h1 className="font-display text-3xl font-bold leading-tight">Thank you!</h1>
      <p className="text-ink-secondary">Your feedback helps improve this chocolate.</p>
      <a
        href={`/p/${sku.id}?${linkQuery({ sku: sku.id }, p)}`}
        className="flex min-h-12 items-center justify-center rounded-xl bg-surface px-4 py-3 text-base font-semibold ring-1 ring-line"
      >
        Back to {sku.name}
      </a>
    </main>
  )
}
