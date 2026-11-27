// Short product story per bar for the shopper page (ADR 0011). Demo content: fairafric writes the real text in a pilot.
// Kept plain on purpose: no claims beyond what the wrapper itself shows.

export interface ProductStory {
  story: string
  tasting: string[]
}

const STORIES: Record<string, ProductStory> = {
  'dark-92': {
    story: 'Made in Ghana, close to where the cocoa grows. A bar for people who like their chocolate deep and intense.',
    tasting: ['Intense', 'Roasted cocoa', 'Long, dry finish'],
  },
  'creamy-oat': {
    story: 'Made in Ghana. A vegan bar with oat for a soft, creamy melt, without milk.',
    tasting: ['Creamy', 'Mild', 'Oat'],
  },
  'creamy-hazelnut': {
    story: 'Made in Ghana. A vegan creamy bar with hazelnut for a rounder, nutty taste.',
    tasting: ['Creamy', 'Nutty', 'Sweet'],
  },
}

export function storyFor(skuId: string): ProductStory | null {
  return STORIES[skuId] ?? null
}
