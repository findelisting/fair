import { ArrowUpRight } from 'lucide-react'

// Outbound link to the brand's own site: no referrer, no opener, nothing embedded (ADR 0003, amendment 1).
export function BrandLink({ href, label, note, highlight = false }: { href: string; label: string; note: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        data-testid="brand-link"
        className={`flex min-h-12 items-center justify-center gap-1.5 rounded-full px-5 py-3 text-base font-semibold ring-1 ring-inset transition-colors ${highlight ? 'bg-caramel text-cocoa ring-caramel' : 'bg-surface text-cocoa ring-cream-deep hover:ring-caramel'}`}
      >
        {label}
        <ArrowUpRight aria-hidden className="h-4 w-4" />
      </a>
      <p className="px-2 text-xs text-ink-tertiary">{note}</p>
    </div>
  )
}
