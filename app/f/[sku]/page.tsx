import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FeedbackForm } from '@/components/FeedbackForm'
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
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-green">Your feedback</p>
        <h1 className="font-display text-3xl font-bold leading-tight">{sku.name}</h1>
      </header>
      <p className="rounded-xl bg-surface px-4 py-3 text-sm text-ink-secondary ring-1 ring-line">
        Your answer is anonymous. We use it only to improve this product. Please don&apos;t enter names,
        email addresses or phone numbers.
      </p>
      <FeedbackForm sku={sku.id} campaign={p.campaign} market={p.market} submissionId={crypto.randomUUID()} />
    </main>
  )
}
