// Inline SVG placeholder for a chocolate bar (ADR 0003, decision 3). Nothing is loaded from outside.
// Replaced by cleared product photos if fairafric provides them. Not fairafric's real packaging:
// the wrapper shows only the bar's name and a "demo image" mark.

export type BarTone = 'dark' | 'oat' | 'hazelnut'

/** Picks the wrapper colours for a SKU id. */
export function toneFor(skuId: string): BarTone {
  if (skuId.startsWith('dark')) return 'dark'
  if (skuId.includes('hazelnut')) return 'hazelnut'
  return 'oat'
}

const TONES: Record<BarTone, { choc: string; chocHi: string; wrap: string; wrapHi: string; ink: string; accent: string }> = {
  dark: { choc: '#2E1A10', chocHi: '#4A2C1B', wrap: '#0B2B24', wrapHi: '#123A30', ink: '#F4F2EA', accent: '#C9A84C' },
  oat: { choc: '#6E4529', chocHi: '#8C5C3B', wrap: '#EFE4D3', wrapHi: '#F7F1E8', ink: '#22150E', accent: '#B8733A' },
  hazelnut: { choc: '#5C3820', chocHi: '#7A4D2E', wrap: '#B8733A', wrapHi: '#C98A52', ink: '#F7F1E8', accent: '#22150E' },
}

/** The big word on the wrapper: "92%" for the dark bar, otherwise the last word of the name. */
function headline(label: string): string {
  const pct = label.match(/\d+%/)
  if (pct) return pct[0]
  const words = label.split(' ')
  return words[words.length - 1]
}

export function ProductImage({ label, tone = 'dark', className }: { label: string; tone?: BarTone; className?: string }) {
  const t = TONES[tone]
  const big = headline(label)
  const id = `bar-${tone}`
  return (
    <svg role="img" aria-label={`Placeholder image: ${label}`} viewBox="0 0 320 210" className={className ?? 'h-auto w-full'}>
      <defs>
        <linearGradient id={`${id}-wrap`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.wrapHi} />
          <stop offset="1" stopColor={t.wrap} />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter={`url(#${id}-shadow)`} transform="rotate(-4 160 105)">
        {/* Unwrapped chocolate: 2 columns by 2 rows of squares with a bevel highlight. */}
        <rect x="30" y="45" width="260" height="120" rx="8" fill={t.choc} />
        {[0, 1].map((col) =>
          [0, 1].map((row) => (
            <g key={`${col}-${row}`}>
              <rect x={40 + col * 52} y={55 + row * 52} width="44" height="44" rx="4" fill={t.chocHi} />
              <rect x={44 + col * 52} y={59 + row * 52} width="36" height="36" rx="3" fill={t.choc} opacity="0.55" />
            </g>
          )),
        )}

        {/* Wrapper with a foil edge. */}
        <rect x="140" y="41" width="154" height="128" rx="6" fill={`url(#${id}-wrap)`} />
        <path
          d={`M140 41 ${Array.from({ length: 16 }, (_, i) => `L${i % 2 ? 140 : 134} ${41 + (i + 1) * 8}`).join(' ')}`}
          fill="none"
          stroke={t.accent}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="140" y="146" width="154" height="4" fill={t.accent} opacity="0.85" />

        <text x="217" y="108" textAnchor="middle" fill={t.ink} fontSize={big.length > 6 ? 24 : 38} fontWeight="800" fontFamily="var(--font-bricolage), sans-serif" letterSpacing="-1">
          {big}
        </text>
        <text x="217" y="130" textAnchor="middle" fill={t.ink} opacity="0.8" fontSize="11" fontWeight="600" fontFamily="var(--font-instrument), sans-serif">
          {label.length > 24 ? `${label.slice(0, 23)}…` : label}
        </text>
        <text x="217" y="162" textAnchor="middle" fill={t.ink} opacity="0.7" fontSize="8" letterSpacing="1.5" fontFamily="var(--font-instrument), sans-serif">
          DEMO IMAGE
        </text>
      </g>
    </svg>
  )
}
