import Link from 'next/link'
import { ArrowRight, LayoutDashboard, MessageSquareHeart, QrCode, Sparkles } from 'lucide-react'
import { DataBadge } from '@/components/DataBadge'
import { HypothesisLabel } from '@/components/HypothesisLabel'
import { LogoSlot } from '@/components/LogoSlot'
import { seedPayload } from '@/lib/catalog'

// Demo guide. Written for a presenter who runs the demo alone: what to tap, in what order,
// and what each label on the dashboard means. The dashboard link leads to the password gate,
// which returns the visitor to /dashboard after sign-in.

const TARGET_LABEL: Record<string, string> = {
  product: 'Product page',
  feedback: 'Feedback form',
  collection: 'Collection page',
  shop: 'Shop',
}

export default function Home() {
  const scanCodes = seedPayload.codes.filter((c) => c.status === 'active' && c.target_type !== 'feedback')
  const feedbackCodes = seedPayload.codes.filter((c) => c.status === 'active' && c.target_type === 'feedback')

  return (
    <main id="main">
      <section className="bg-night text-ivory [--focus-ring:var(--color-gold)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 pb-14 pt-12 md:pb-20 md:pt-20">
          <div className="flex flex-wrap items-center gap-4">
            <LogoSlot />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Finde × fairafric · Demo guide</p>
          </div>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            From the QR code on the pack to the customer&apos;s voice.
          </h1>
          <p className="max-w-2xl text-lg text-mist">
            Scan a code, leave feedback, and watch both arrive on the dashboard within seconds.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gold px-6 py-3 font-semibold text-night transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <LayoutDashboard aria-hidden className="h-5 w-5" />
              Open the dashboard
            </Link>
            <p className="text-sm text-mist">Asks for the demo password.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="steps" className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <h2 id="steps" className="font-display text-2xl font-bold md:text-3xl">
          The demo in four steps
        </h2>
        <ol className="mt-8 flex flex-col">
          <Step n={1} icon={<QrCode aria-hidden className="h-5 w-5" />} title="Scan a code as a shopper would">
            <p>Scan the printed QR code, or tap a test code below. Each tap counts as one real scan.</p>
            <CodeList codes={scanCodes} />
          </Step>
          <Step n={2} icon={<MessageSquareHeart aria-hidden className="h-5 w-5" />} title="Leave feedback">
            <p>
              On the product page, tap <strong className="font-semibold text-ink">Give feedback</strong>. Or use the feedback code,
              which opens the form directly. Three questions, no names or contact details.
            </p>
            <CodeList codes={feedbackCodes} />
          </Step>
          <Step n={3} icon={<LayoutDashboard aria-hidden className="h-5 w-5" />} title="See it on the dashboard">
            <p>
              The scan and the answer appear within 10 seconds. Switch between product and collection view, and filter by market
              or campaign.
            </p>
          </Step>
          <Step n={4} icon={<Sparkles aria-hidden className="h-5 w-5" />} title="Hear from the product agent" last>
            <p>The product reports from its own memory of scans, visits and feedback. Every answer lists the data it used, with dates.</p>
          </Step>
        </ol>
      </section>

      <section aria-labelledby="labels" className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:grid-cols-[1fr_2fr] md:py-16">
          <div>
            <h2 id="labels" className="font-display text-2xl font-bold">
              What the labels mean
            </h2>
            <p className="mt-2 text-ink-secondary">Every number and idea on the dashboard carries one of these.</p>
          </div>
          <dl className="grid gap-5 sm:grid-cols-3">
            <Label badge={<DataBadge kind="live" />} text="Recorded from real scans and answers during this demo." />
            <Label badge={<DataBadge kind="synthetic" />} text="Generated to show what a full season could look like." />
            <Label badge={<HypothesisLabel />} text="An idea worth testing. Not proven by the data." />
          </dl>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-5 py-8 text-sm text-ink-tertiary">
        Demo prototype by Finde. No tracking cookies. Videos stay on fairafric&apos;s own site.
      </footer>
    </main>
  )
}

function Step({ n, icon, title, children, last = false }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <li className="grid grid-cols-[2.75rem_1fr] gap-x-4 md:grid-cols-[3rem_1fr] md:gap-x-6">
      <div className="flex flex-col items-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green font-display text-lg font-bold text-ivory md:h-12 md:w-12">
          {n}
        </span>
        {!last && <span aria-hidden className="w-0.5 flex-1 bg-mist" />}
      </div>
      <div className={`flex flex-col gap-3 ${last ? '' : 'pb-10'}`}>
        <h3 className="flex min-h-11 items-center gap-2 font-display text-xl font-bold md:min-h-12">
          <span className="text-green">{icon}</span>
          {title}
        </h3>
        <div className="flex max-w-2xl flex-col gap-4 text-ink-secondary">{children}</div>
      </div>
    </li>
  )
}

function CodeList({ codes }: { codes: typeof seedPayload.codes }) {
  const market = new Map(seedPayload.markets.map((m) => [m.code, m.name]))
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {codes.map((c) => (
        <li key={c.id}>
          {/* Plain <a>, never next/link: a prefetch of /r/ would count as a scan. */}
          <a
            href={`/r/${c.id}`}
            className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line transition-colors hover:ring-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
          >
            <span className="flex flex-col">
              <span className="font-semibold text-ink">{c.label.split(',')[0]}</span>
              <span className="text-xs text-ink-tertiary">
                {TARGET_LABEL[c.target_type]} · {market.get(c.market) ?? c.market} · code {c.id}
              </span>
            </span>
            <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-green transition-transform group-hover:translate-x-0.5" />
          </a>
        </li>
      ))}
    </ul>
  )
}

function Label({ badge, text }: { badge: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <dt>{badge}</dt>
      <dd className="text-sm text-ink-secondary">{text}</dd>
    </div>
  )
}
