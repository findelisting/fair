// Campaign and market from the URL are untrusted (ADR 0003, decision 5).
// Only known campaign IDs and market codes are kept; anything else becomes null.
import { isCampaign, isMarket } from './catalog'

type Raw = URLSearchParams | Record<string, string | string[] | undefined>

function single(sp: Raw, key: string): string | null {
  if (sp instanceof URLSearchParams) {
    const all = sp.getAll(key)
    return all.length === 1 ? all[0] : null
  }
  const v = sp[key]
  return typeof v === 'string' ? v : null
}

export interface CleanParams {
  campaign: string | null
  market: string | null
}

export function cleanParams(sp: Raw): CleanParams {
  const campaign = single(sp, 'campaign')
  const market = single(sp, 'market')
  return {
    campaign: campaign && isCampaign(campaign) ? campaign : null,
    market: market && isMarket(market) ? market : null,
  }
}

/** Query string for links between public pages. Only cleaned values are passed on. */
export function linkQuery(base: Record<string, string>, p: CleanParams, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams(base)
  if (p.campaign) q.set('campaign', p.campaign)
  if (p.market) q.set('market', p.market)
  for (const [k, v] of Object.entries(extra)) q.set(k, v)
  return q.toString()
}
