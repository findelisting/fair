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
        <DemoBanner />
        {children}
      </body>
    </html>
  )
}
