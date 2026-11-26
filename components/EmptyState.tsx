import { Inbox } from 'lucide-react'

/** Shown by a dashboard panel that has no data yet (BUILD_PLAN.md slice 4). */
export function EmptyState({ title = 'No data yet', hint }: { title?: string; hint?: string }) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-4 py-10 text-center">
      <Inbox aria-hidden className="h-6 w-6 text-ink-tertiary" />
      <p className="text-sm font-medium text-ink-secondary">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-tertiary">{hint}</p>}
    </div>
  )
}
