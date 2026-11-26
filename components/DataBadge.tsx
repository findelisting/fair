import { cn } from '@/lib/utils'

export type DataKind = 'live' | 'synthetic' | 'mixed'

const STYLES: Record<DataKind, { label: string; className: string; dot: string }> = {
  live: { label: 'Live', className: 'bg-green/10 text-green-deep ring-green/30', dot: 'bg-green' },
  synthetic: { label: 'Synthetic data', className: 'bg-synthetic-surface text-synthetic ring-synthetic/30', dot: 'bg-synthetic' },
  mixed: { label: 'Live + synthetic data', className: 'bg-brand/15 text-ink ring-brand/40', dot: 'bg-brand' },
}

/** Marks every dashboard panel as Live or Synthetic data (APPROACH.md section 6). */
export function DataBadge({ kind, className }: { kind: DataKind; className?: string }) {
  const s = STYLES[kind]
  return (
    <span
      data-testid="data-badge"
      data-kind={kind}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', s.className, className)}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}
