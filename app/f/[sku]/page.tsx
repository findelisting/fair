import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Lock } from 'lucide-react'
import { FeedbackForm } from '@/components/FeedbackForm'
import { ProductImage, toneFor } from '@/components/ProductImage'
import { skuById } from '@/lib/catalog'
import { cleanParams } from '@/lib/params'
import { trackPageView } from '@/lib/recordPageView'

// Feedback page (ADR 0003). A fresh one-time token per render stops double submits (decision 7).
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ sku: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sku = skuById((await params).sku)
  return { title: sku ? `Feedback: ${sku.name} | fairafric demo` : 'Not found' }
}

export default async function FeedbackPage({ params, searchParams }: Props) {
  const sku = skuById((await params).sku)
  if (!sku || sku.status !== 'active') notFound()
  const p = cleanParams(await searchParams)

  await trackPageView({ page: 'feedback', sku_id: sku.id, campaign_id: p.campaign, market: p.market })

  return (
    <main id="main" className="min-h-[calc(100dvh-36px)] [--focus-ring:var(--color-caramel)] bg-cream text-cocoa">
      <section className="cocoa-grain text-cream">
        <header className="mx-auto flex max-w-xl items-center gap-4 px-5 py-8">
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-caramel">Your feedback</p>
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">{sku.name}</h1>
            <p className="text-sm text-cream/75">Three quick questions.</p>
          </div>
          <ProductImage label={sku.name} tone={toneFor(sku.id)} className="h-auto w-28 shrink-0 sm:w-36" />
        </header>
      </section>
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-8">
        <p className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-3 text-sm text-ink-secondary ring-1 ring-cream-deep">
          <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-caramel-deep" />
          <span>
            <strong className="block text-base font-semibold text-cocoa">No name, no email, no account.</strong>
            Your answer is anonymous. We use it only to improve this product. Please don&apos;t enter names, email addresses or
            phone numbers.
          </span>
        </p>
        <FeedbackForm sku={sku.id} campaign={p.campaign} market={p.market} submissionId={crypto.randomUUID()} />
      </div>
    </main>
  )
}
