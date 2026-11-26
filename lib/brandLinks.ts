// Real links to fairafric's own site (ADR 0003, amendment 1). The app hosts no video and no shop:
// these are plain outbound links. SKUs without an entry keep their labelled demo buttons.
export type BrandLinks = { shop?: string; story?: string }

export const BRAND_LINKS: Record<string, BrandLinks> = {
  'dark-92': {
    shop: 'https://www.fairafric.com/en/products/92-organic-dark-chocolate',
  },
}

export function brandLinksFor(sku: string): BrandLinks {
  return BRAND_LINKS[sku] ?? {}
}
