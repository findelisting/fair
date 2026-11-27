import { EVIDENCE, type EvidenceKind } from '@/lib/evidence'
import { cn } from '@/lib/utils'

// How directly a number is known (ADR 0010). Since ADR 0012 a small icon next to a card title, linked to
// the data-confidence key, instead of a text pill. The accessible name carries the full meaning.

export function EvidenceGlyph({ kind, className }: { kind: EvidenceKind; className?: string }) {
  const common = { 'aria-hidden': true, viewBox: '0 0 16 16', className: cn('h-3.5 w-3.5 shrink-0', className) } as const
  switch (kind) {
    case 'observed':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5" fill="currentColor" />
        </svg>
      )
    case 'attributed':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 3.25a4.75 4.75 0 0 0 0 9.5z" fill="currentColor" />
        </svg>
      )
    case 'correlation':
      return (
        <svg {...common}>
          <path d="M8 2.5 13.5 8 8 13.5 2.5 8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'reference':
      return (
        <svg {...common}>
          <path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}

/** Icon (optionally with its short label) that links to the data-confidence key. */
export function EvidenceTag({ kind, withLabel = false, className }: { kind: EvidenceKind; withLabel?: boolean; className?: string }) {
  const e = EVIDENCE[kind]
  return (
    <a
      href="#confidence-key"
      data-testid="evidence-tag"
      data-evidence={kind}
      aria-label={`${e.label}: ${e.meaning}`}
      title={`${e.label}: ${e.meaning}`}
      className={cn(
        'inline-flex min-h-6 min-w-6 items-center justify-center gap-1 rounded-full text-xs font-semibold text-ink-secondary transition-colors hover:text-green-deep',
        withLabel && 'px-1',
        className,
      )}
    >
      <EvidenceGlyph kind={kind} />
      {withLabel && <span aria-hidden>{e.label}</span>}
    </a>
  )
}
