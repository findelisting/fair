import { EVIDENCE, type EvidenceKind } from '@/lib/evidence'
import { cn } from '@/lib/utils'

/** How directly a number is known (ADR 0010). Outline style, so it never looks like the filled Live / Synthetic badge. */
export function EvidenceTag({ kind, className }: { kind: EvidenceKind; className?: string }) {
  const e = EVIDENCE[kind]
  return (
    <span
      data-testid="evidence-tag"
      data-evidence={kind}
      title={e.meaning}
      className={cn('inline-flex items-center rounded-full border border-dashed border-ink-tertiary/60 px-2.5 py-0.5 text-xs font-semibold text-ink-secondary', className)}
    >
      {e.label}
    </span>
  )
}
