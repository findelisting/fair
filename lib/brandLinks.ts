// Real links to fairafric's own shop and its own YouTube video (ADR 0003, amendment 1). The app hosts no video and no shop:
// these are plain outbound links. SKUs without an entry keep their labelled demo buttons.
/** Hosts a brand link may point to (https only). */
export const BRAND_HOSTS = ['fairafric.com', 'fairafricghana.com', 'youtube.com']

export type BrandLinks = { shop?: string; story?: string }

export const BRAND_LINKS: Record<string, BrandLinks> = {
  'dark-92': {
    shop: 'https://www.fairafricghana.com/products/92-dark-chocolate',
    story: 'https://www.youtube.com/watch?v=UtMBaHedmek',
  },
}

export function brandLinksFor(sku: string): BrandLinks {
  return BRAND_LINKS[sku] ?? {}
}
