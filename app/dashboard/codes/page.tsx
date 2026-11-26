import { existsSync } from 'node:fs'
import path from 'node:path'
import { headers } from 'next/headers'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { buildSheet, checkBaseUrl } from '@/lib/qrSheet'
import { PrintButton } from './PrintButton'

// Printable QR sheet (slice 8, ADR 0004). Behind the demo password via proxy.ts (ADR 0007, decision 6).
export const dynamic = 'force-dynamic'

const LOGO_PUBLIC_PATH = '/brand/fairafric-logo.svg'

export default async function CodesSheet() {
  // Q-6: PUBLIC_BASE_URL when set; in dev without it, the request's own origin (always flagged as a test address).
  const h = await headers()
  const host = h.get('host')
  const base = process.env.PUBLIC_BASE_URL || (host ? `http://${host}` : '')
  const status = checkBaseUrl(base)
  const hasLogo = existsSync(path.join(process.cwd(), 'public', LOGO_PUBLIC_PATH))
  const cards = status === 'invalid' ? [] : await buildSheet(base, hasLogo ? LOGO_PUBLIC_PATH : null)

  return (
    <main className="qr-sheet mx-auto max-w-[210mm] px-6 py-8 print:p-0">
      <style>{`@page { size: A4; margin: 10mm } .qr-sheet, .qr-sheet * { print-color-adjust: exact; -webkit-print-color-adjust: exact } @media print { .qr-card { break-inside: avoid } }`}</style>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-green">Finde × fairafric · QR codes</p>
          <h1 className="font-display text-xl font-bold">Demo prototype</h1>
        </div>
        <PrintButton />
      </header>

      {status === 'ok' ? (
        <p data-testid="print-ready" className="mb-4 flex items-center gap-2 text-sm font-medium text-green-deep">
          <CheckCircle2 aria-hidden className="h-4 w-4" /> Print-ready: codes point to {base}
        </p>
      ) : (
        <p data-testid="base-url-warning" role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {status === 'invalid'
            ? 'Not print-ready: PUBLIC_BASE_URL is missing or not a valid URL.'
            : `Not print-ready: these codes point to a test address (${base}).`}
        </p>
      )}

      {!hasLogo && (
        <p data-testid="logo-offer" className="mb-4 text-sm text-ink-secondary print:hidden">
          Want your logo in the centre of each code? Send us your logo file and we add it to every code.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-0 sm:grid-cols-3 print:grid-cols-3">
        {cards.map((c) => (
          <li
            key={c.code}
            data-testid="qr-card"
            data-code={c.code}
            data-url={c.url}
            data-active={c.active}
            className={`qr-card flex flex-col items-center gap-2 border border-dashed border-ink-tertiary/40 p-4 text-center ${c.active ? '' : 'opacity-40'}`}
          >
            <p className="text-xs font-semibold">Scan for the story behind this bar</p>
            <div
              data-testid="qr-code"
              className="qr-code bg-white [&>svg]:h-full [&>svg]:w-full"
              style={{ width: '35mm', height: '35mm' }}
              // SVG produced by the qrcode package from our own URL; no user input.
              dangerouslySetInnerHTML={{ __html: c.svg }}
            />
            <p className="text-xs font-medium leading-snug">{c.label}</p>
            <p className="text-[10px] text-ink-secondary">
              {c.campaign} · {c.market} · <span className="font-mono">{c.code}</span>
            </p>
            <p className="flex gap-1">
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ring-line">Demo only</span>
              {!c.active && <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ring-line">Inactive</span>}
            </p>
          </li>
        ))}
      </ul>

      <footer className="mt-4 text-[10px] text-ink-tertiary">
        Base URL: {base || 'not set'} · Generated {new Date().toISOString().slice(0, 10)}
      </footer>
    </main>
  )
}
