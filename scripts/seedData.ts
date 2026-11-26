// The demo catalogue: 3 SKUs, 1 collection, 8 markets, 4 campaigns and the QR codes.
// Code slugs are fixed, so printed QR codes keep working after every reset (APPROACH.md section 11).
// SKU names are generic placeholders until fairafric confirms real names (APPROACH.md section 17).

export interface SeedPayload {
  markets: { code: string; name: string }[]
  collections: { id: string; name: string; description: string }[]
  skus: { id: string; name: string; variety: string; format: string; description: string; status: 'active' | 'inactive' }[]
  collection_skus: { collection_id: string; sku_id: string; position: number }[]
  campaigns: { id: string; name: string; channel: 'wrapper' | 'shelf_talker' | 'influencer' | 'trade_fair'; starts_on: string; ends_on: string }[]
  codes: {
    id: string
    label: string
    target_type: 'product' | 'feedback' | 'shop' | 'collection'
    sku_id: string | null
    collection_id: string | null
    campaign_id: string
    market: string
    status: 'active' | 'inactive'
  }[]
}

export const seedPayload: SeedPayload = {
  markets: [
    { code: 'DE', name: 'Germany' },
    { code: 'AT', name: 'Austria' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'FR', name: 'France' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'GH', name: 'Ghana' },
    { code: 'CZ', name: 'Czechia' },
    { code: 'SK', name: 'Slovakia' },
  ],
  collections: [
    { id: 'vegan-creamy', name: 'Vegan Creamy line', description: 'Demo collection: the vegan Creamy bars.' },
  ],
  skus: [
    { id: 'dark-92', name: 'Dark 92%', variety: '92% dark chocolate', format: '80 g', description: 'Demo product page content.', status: 'active' },
    { id: 'creamy-oat', name: 'Vegan Creamy Oat', variety: 'Vegan creamy, oat', format: '80 g', description: 'Demo product page content.', status: 'active' },
    { id: 'creamy-hazelnut', name: 'Vegan Creamy Hazelnut', variety: 'Vegan creamy, hazelnut', format: '80 g', description: 'Demo product page content.', status: 'active' },
  ],
  collection_skus: [
    { collection_id: 'vegan-creamy', sku_id: 'creamy-oat', position: 1 },
    { collection_id: 'vegan-creamy', sku_id: 'creamy-hazelnut', position: 2 },
  ],
  campaigns: [
    { id: 'wrapper-2026', name: 'On-pack wrapper code', channel: 'wrapper', starts_on: '2026-09-01', ends_on: '2027-08-31' },
    { id: 'shelf-q4-2026', name: 'Shelf talker, Q4', channel: 'shelf_talker', starts_on: '2026-10-01', ends_on: '2026-12-31' },
    { id: 'influencer-q4-2026', name: 'Influencer posts, Q4', channel: 'influencer', starts_on: '2026-10-15', ends_on: '2027-01-31' },
    { id: 'trade-fair-2027', name: 'Trade fair stand', channel: 'trade_fair', starts_on: '2026-11-01', ends_on: '2027-02-28' },
  ],
  codes: [
    { id: 'd92-at', label: 'Dark 92%, wrapper, Austria', target_type: 'product', sku_id: 'dark-92', collection_id: null, campaign_id: 'wrapper-2026', market: 'AT', status: 'active' },
    { id: 'oat-de', label: 'Vegan Creamy Oat, wrapper, Germany', target_type: 'product', sku_id: 'creamy-oat', collection_id: null, campaign_id: 'wrapper-2026', market: 'DE', status: 'active' },
    { id: 'haz-ch', label: 'Vegan Creamy Hazelnut, shelf talker, Switzerland', target_type: 'product', sku_id: 'creamy-hazelnut', collection_id: null, campaign_id: 'shelf-q4-2026', market: 'CH', status: 'active' },
    { id: 'fb-d92', label: 'Dark 92% feedback, shelf talker, Austria', target_type: 'feedback', sku_id: 'dark-92', collection_id: null, campaign_id: 'shelf-q4-2026', market: 'AT', status: 'active' },
    { id: 'vc-de', label: 'Vegan Creamy collection, influencer, Germany', target_type: 'collection', sku_id: null, collection_id: 'vegan-creamy', campaign_id: 'influencer-q4-2026', market: 'DE', status: 'active' },
  ],
}

/** Checks the payload's internal references. Returns a list of problems (empty when valid). */
export function validateSeed(p: SeedPayload): string[] {
  const problems: string[] = []
  const markets = new Set(p.markets.map((m) => m.code))
  const skus = new Set(p.skus.map((s) => s.id))
  const collections = new Set(p.collections.map((c) => c.id))
  const campaigns = new Set(p.campaigns.map((c) => c.id))
  const dupes = (ids: string[], what: string) => {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) problems.push(`duplicate ${what}: ${id}`)
      seen.add(id)
    }
  }
  dupes(p.markets.map((m) => m.code), 'market')
  dupes(p.skus.map((s) => s.id), 'sku')
  dupes(p.collections.map((c) => c.id), 'collection')
  dupes(p.campaigns.map((c) => c.id), 'campaign')
  dupes(p.codes.map((c) => c.id), 'code')

  for (const cs of p.collection_skus) {
    if (!collections.has(cs.collection_id)) problems.push(`collection_skus: unknown collection ${cs.collection_id}`)
    if (!skus.has(cs.sku_id)) problems.push(`collection_skus: unknown sku ${cs.sku_id}`)
  }
  for (const c of p.campaigns) {
    if (c.ends_on < c.starts_on) problems.push(`campaign ${c.id}: ends before it starts`)
  }
  for (const c of p.codes) {
    if (!/^[a-z0-9-]{3,32}$/.test(c.id)) problems.push(`code ${c.id}: bad slug`)
    if (!campaigns.has(c.campaign_id)) problems.push(`code ${c.id}: unknown campaign ${c.campaign_id}`)
    if (!markets.has(c.market)) problems.push(`code ${c.id}: unknown market ${c.market}`)
    if (c.target_type === 'collection') {
      if (!c.collection_id || !collections.has(c.collection_id)) problems.push(`code ${c.id}: needs a known collection`)
      if (c.sku_id) problems.push(`code ${c.id}: collection code must not have a sku`)
    } else {
      if (!c.sku_id || !skus.has(c.sku_id)) problems.push(`code ${c.id}: needs a known sku`)
      if (c.collection_id) problems.push(`code ${c.id}: sku code must not have a collection`)
    }
  }
  return problems
}
