import type { Metadata, Viewport } from 'next'
import { DemoBanner } from '@/components/DemoBanner'
import { bodyFont, displayFont } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Finde × fairafric demo',
  description: 'Demo prototype: on-pack QR codes, scans and feedback per SKU. Synthetic data.',
  // Demo pages must never be indexed (APPROACH.md section 6). The X-Robots-Tag header says the same.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-12 focus:z-[60] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg"
        >
          Skip to content
        </a>
        <DemoBanner />
        {children}
      </body>
    </html>
  )
}
