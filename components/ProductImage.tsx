// Inline SVG placeholder for a chocolate bar (ADR 0003, decision 3). Nothing is loaded from outside.
// Replaced by cleared product photos if fairafric provides them.
export function ProductImage({ label, tone = 'dark' }: { label: string; tone?: 'dark' | 'creamy' }) {
  const bar = tone === 'dark' ? '#3B2418' : '#8A5A3B'
  const wrap = tone === 'dark' ? '#0B2B24' : '#0F6E56'
  return (
    <svg
      role="img"
      aria-label={`Placeholder image: ${label}`}
      viewBox="0 0 320 200"
      className="h-auto w-full rounded-2xl bg-ivory"
    >
      <rect x="40" y="40" width="240" height="120" rx="10" fill={bar} />
      <g fill="#000" opacity="0.18">
        {[0, 1, 2, 3].map((col) =>
          [0, 1].map((row) => <rect key={`${col}-${row}`} x={52 + col * 57} y={52 + row * 54} width="47" height="44" rx="4" />),
        )}
      </g>
      <rect x="150" y="40" width="130" height="120" rx="10" fill={wrap} />
      <rect x="150" y="40" width="8" height="120" fill="#C9A84C" />
      <text x="218" y="98" textAnchor="middle" fill="#F4F2EA" fontSize="15" fontWeight="700" fontFamily="sans-serif">
        {label.length > 14 ? `${label.slice(0, 13)}…` : label}
      </text>
      <text x="218" y="120" textAnchor="middle" fill="#C9A84C" fontSize="10" fontFamily="sans-serif">
        demo image
      </text>
    </svg>
  )
}
