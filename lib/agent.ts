// Product agent: fixed questions, count-based answers, every number with its source (ADR 0006).
// Pure: no database, no server-only imports, so unit tests can use it. Database calls live in lib/agentData.ts.
// Spec: docs/specs/slice-6-product-agent.md section 5.
import type { DataKind } from '@/components/DataBadge'
import type { Source } from '@/components/SourceList'
import { displayValue, formatAccessDate, type CompetitorProduct } from './insights'

// scope: what each answer covers, shown with the answer, because the dashboard filters do not apply to it (ADR 0011).
export const QUESTIONS = [
  { id: 'top-packaging-at', question: 'Which packaging had the most scans in Austria?', scope: 'Austria · all bars and campaigns' },
  { id: 'feedback-visits-by-campaign', question: 'Which campaign drove visits to the feedback page?', scope: 'All markets and campaigns' },
  { id: 'top-theme-dark-92', question: 'Which theme comes up most for the 92% bar?', scope: 'Dark 92% · all markets and campaigns' },
  { id: 'comparable-dark-bars', question: 'What do comparable dark bars cost?', scope: 'Public listings, with their dates' },
] as const

/** Questions that span products, so they also fit the collection view (ADR 0011). */
export const COLLECTION_QUESTIONS = ['top-packaging-at', 'feedback-visits-by-campaign'] as const

export type QuestionId = (typeof QUESTIONS)[number]['id']
export type DataQuestionId = Exclude<QuestionId, 'comparable-dark-bars'>

export function isQuestionId(x: unknown): x is QuestionId {
  return typeof x === 'string' && QUESTIONS.some((q) => q.id === x)
}

export function questionText(id: QuestionId): string {
  return QUESTIONS.find((q) => q.id === id)!.question
}

/** One row from an agent_* database function. */
export interface AgentRow {
  key: string
  label: string
  total: number
  live: number
  synthetic: number
  first_ts: string | null
  last_ts: string | null
}

export interface AgentAnswer {
  id: QuestionId
  question: string
  answer: string
  sources: Source[]
  asOf: string
  /** Live and synthetic rows behind a data answer (absent for the price answer). */
  counts?: { live: number; synthetic: number }
}

export const NO_DATA = 'Not enough data yet for this question.'

const COUNT = new Intl.NumberFormat('en-GB')
export function formatCount(n: number): string {
  return COUNT.format(n)
}

// Fixed month names: Node's en-GB data writes "Sept", browsers and tests expect "Sep".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const BERLIN_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function berlinParts(d: Date) {
  const parts = BERLIN_PARTS.formatToParts(d)
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? ''
  const hour = get('hour') === '24' ? '00' : get('hour')
  return { dayMonth: `${Number(get('day'))} ${MONTHS[Number(get('month')) - 1]}`, year: get('year'), time: `${hour}:${get('minute')}` }
}

/** "26 Nov 2026, 14:05" in Berlin time. */
export function formatBerlin(d: Date): string {
  const p = berlinParts(d)
  return `${p.dayMonth} ${p.year}, ${p.time}`
}

/** "28 Sep to 26 Nov 2026", or with both years when they differ. */
export function formatRange(first: string | null, last: string | null): string | null {
  if (!first || !last) return null
  const a = berlinParts(new Date(first))
  const b = berlinParts(new Date(last))
  return a.year === b.year ? `${a.dayMonth} to ${b.dayMonth} ${b.year}` : `${a.dayMonth} ${a.year} to ${b.dayMonth} ${b.year}`
}

export function kindOf(live: number, synthetic: number): DataKind | undefined {
  if (live > 0 && synthetic > 0) return 'mixed'
  if (live > 0) return 'live'
  if (synthetic > 0) return 'synthetic'
  return undefined
}

const DATA_SOURCES: Record<DataQuestionId, { name: string; filter: string; unit: string }> = {
  'top-packaging-at': { name: 'QR scans', filter: 'Austria, bot scans left out', unit: 'scans' },
  'feedback-visits-by-campaign': { name: 'Feedback page visits', filter: 'Feedback page only', unit: 'visits' },
  'top-theme-dark-92': { name: 'Feedback answers', filter: 'Dark 92% bar', unit: 'answers' },
}

function sentence(id: DataQuestionId, rows: AgentRow[]): string {
  if (rows.length === 0) return NO_DATA
  const [top, next] = rows
  if (next && next.total === top.total) return `${top.label} and ${next.label} are tied with ${formatCount(top.total)} each.`
  const all = rows.reduce((n, r) => n + r.total, 0)
  switch (id) {
    case 'top-packaging-at':
      return next
        ? `The ${top.label} code had the most scans in Austria: ${formatCount(top.total)}, against ${formatCount(next.total)} for the ${next.label} code.`
        : `The ${top.label} code had the most scans in Austria: ${formatCount(top.total)}.`
    case 'feedback-visits-by-campaign':
      return `Most feedback-page visits came from the ${top.label} campaign: ${formatCount(top.total)} of ${formatCount(all)} visits.`
    case 'top-theme-dark-92':
      return `${top.label} comes up most in feedback on the Dark 92% bar: ${formatCount(top.total)} of ${formatCount(all)} answers.`
  }
}

/** Answer and sources for one of the three data questions. */
export function buildAnswer(id: DataQuestionId, rows: AgentRow[], asOf: Date): AgentAnswer {
  const live = rows.reduce((n, r) => n + r.live, 0)
  const synthetic = rows.reduce((n, r) => n + r.synthetic, 0)
  const total = live + synthetic
  const first = rows.reduce<string | null>((m, r) => (r.first_ts && (!m || r.first_ts < m) ? r.first_ts : m), null)
  const last = rows.reduce<string | null>((m, r) => (r.last_ts && (!m || r.last_ts > m) ? r.last_ts : m), null)
  const range = formatRange(first, last)
  const { name, filter, unit } = DATA_SOURCES[id]
  const detail = [filter, `${formatCount(total)} ${unit} (${formatCount(live)} live, ${formatCount(synthetic)} synthetic)`, range]
    .filter(Boolean)
    .join(' · ')
  return {
    id,
    question: questionText(id),
    answer: sentence(id, rows),
    sources: [{ name, detail, date: formatBerlin(asOf), kind: kindOf(live, synthetic) }],
    asOf: asOf.toISOString(),
    counts: { live, synthetic },
  }
}

/** Answer for "What do comparable dark bars cost?" from the public listings in data/competitors.json. */
export function buildPriceAnswer(products: CompetitorProduct[], asOf: Date): AgentAnswer {
  const id = 'comparable-dark-bars' as const
  if (products.length === 0) return { id, question: questionText(id), answer: NO_DATA, sources: [], asOf: asOf.toISOString() }

  let anyEstimate = false
  const clauses = products.map((p) => {
    const find = (label: string) => p.values.find((v) => v.label === label)
    const show = (label: string) => {
      const v = find(label)
      if (!v) return null
      const text = displayValue(p, v)
      if (text.startsWith('~')) anyEstimate = true
      return text
    }
    const price = show('Price')
    const size = find('Pack size')?.value
    const perKg = show('Price per kg')
    const main = [price, size && `for ${size}`].filter(Boolean).join(' ')
    return `${p.brand} ${p.product}${main ? `, ${main}` : ''}${perKg ? ` (${perKg} per kg)` : ''}`
  })

  const sources: Source[] = []
  for (const p of products) {
    const used = new Set(p.values.map((v) => v.source))
    for (const key of used) {
      const s = p.sources[key]
      if (s) sources.push({ name: s.publisher, detail: `${p.brand} ${p.product}`, url: s.url, date: formatAccessDate(s.accessedOn) })
    }
  }

  const note = anyEstimate ? ' Prices with ~ are estimates from public listings.' : ''
  return { id, question: questionText(id), answer: `Comparable dark bars: ${clauses.join('; ')}.${note}`, sources, asOf: asOf.toISOString() }
}
