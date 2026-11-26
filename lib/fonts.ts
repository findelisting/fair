import { Bricolage_Grotesque, Instrument_Sans } from 'next/font/google'

// Same type pairing as the Finde frontend. next/font downloads the fonts at build
// time and serves them from our own domain, so pages make no third-party requests.
export const displayFont = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-bricolage' })
export const bodyFont = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-instrument' })
