import 'server-only'
import { normalizeSummary, type DashboardParams, type DashboardSummary } from './dashboard'
import { supabaseServer } from './supabaseServer'

/** One database call for every dashboard number (ADR 0007, decision 2). Throws when the database fails. */
export async function getDashboard(p: DashboardParams): Promise<DashboardSummary> {
  const { data, error } = await supabaseServer().rpc('dashboard_summary', {
    p_view: p.view,
    p_id: p.id,
    p_market: p.market,
    p_campaign: p.campaign,
  })
  if (error) throw new Error(error.message)
  return normalizeSummary(data)
}

export async function recordInsightCheck(cardId: string, answer: 'up' | 'down'): Promise<void> {
  const { error } = await supabaseServer().from('insight_checks').insert({ card_id: cardId, answer })
  if (error) throw new Error(error.message)
}
