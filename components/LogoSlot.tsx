import { cn } from '@/lib/utils'

/** Plain placeholder for the fairafric logo until the brand sends the file (design brief). */
export function LogoSlot({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span
      data-testid="logo-slot"
      className={cn(
        'inline-flex h-9 w-32 items-center justify-center rounded-lg border border-dashed text-xs font-medium',
        tone === 'dark' ? 'border-cream/40 text-cream/80' : 'border-ink-tertiary text-ink-tertiary',
        className,
      )}
    >
      fairafric logo
    </span>
  )
}
