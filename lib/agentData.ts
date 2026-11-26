import 'server-only'
import { buildAnswer, buildPriceAnswer, type AgentAnswer, type AgentRow, type DataQuestionId, type QuestionId } from './agent'
import { competitors } from './insights'
import { supabaseServer } from './supabaseServer'

// Database side of the product agent (ADR 0006). Each data question is one database function call.

const CALLS: Record<DataQuestionId, { fn: string; args: Record<string, unknown> }> = {
  'top-packaging-at': { fn: 'agent_scans_by_code', args: { p_market: 'AT' } },
  'feedback-visits-by-campaign': { fn: 'agent_feedback_visits_by_campaign', args: {} },
  'top-theme-dark-92': { fn: 'agent_themes_for_sku', args: { p_sku: 'dark-92' } },
}

const TIMEOUT_MS = 8_000

export async function getAnswer(id: QuestionId, now: Date = new Date()): Promise<AgentAnswer> {
  if (id === 'comparable-dark-bars') return buildPriceAnswer(competitors.filter((p) => p.comparesTo === 'dark-92'), now)

  const { fn, args } = CALLS[id]
  const { data, error } = await supabaseServer().rpc(fn, args).abortSignal(AbortSignal.timeout(TIMEOUT_MS))
  if (error) throw new Error(`${fn} failed: ${error.code ?? ''} ${error.message}`.trim())
  const rows: AgentRow[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    key: String(r.key),
    label: String(r.label),
    total: Number(r.total),
    live: Number(r.live),
    synthetic: Number(r.synthetic),
    first_ts: (r.first_ts as string | null) ?? null,
    last_ts: (r.last_ts as string | null) ?? null,
  }))
  return buildAnswer(id, rows, now)
}
