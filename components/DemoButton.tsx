import { cn } from '@/lib/utils'

/**
 * A button that stands in for a link we do not have yet (shop, video). It is a real button
 * that goes nowhere, with a visible note, so there is no wrong URL and no video (ADR 0003, decision 3).
 */
export function DemoButton({ label, note, highlight = false }: { label: string; note: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-disabled="true"
        data-highlight={highlight ? 'true' : 'false'}
        className={cn(
          'min-h-12 w-full cursor-default rounded-xl px-4 py-3 text-base font-semibold ring-1 ring-inset',
          highlight ? 'bg-gold text-night ring-gold' : 'bg-surface text-ink ring-line',
        )}
      >
        {label}
      </button>
      <p className="px-1 text-xs text-ink-tertiary">{note}</p>
    </div>
  )
}
