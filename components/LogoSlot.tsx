import { cn } from '@/lib/utils'

/**
 * Plain text wordmark until the brand sends its logo file (ADR 0011). Set in the demo's own display font,
 * with no shapes or colours taken from the brand's logo, so it never imitates the real mark.
 */
export function LogoSlot({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span
      data-testid="brand-wordmark"
      className={cn('font-display text-2xl font-extrabold lowercase tracking-tight', tone === 'dark' ? 'text-cream' : 'text-ink', className)}
    >
      fairafric
    </span>
  )
}
