# Spec: slice 6, product agent

- Status: Draft, waiting for ADR 0006 to be accepted
- Decision record: [ADR 0006](../adr/0006-product-agent.md)
- Replaces: BUILD_PLAN.md slice 6 task list
- Build rule: the tests in section 7 are written first and fail, then the code makes them pass.

## 1. Goal

A marketer picks one of four prepared questions and gets a plain answer in one or two sentences, with every number traced to its source, date range and kind (live or synthetic). A live scan in the room shows up in the answer within seconds.

## 2. Files

| File | Change |
|---|---|
| `supabase/migrations/<ts>_agent_functions.sql` | **New.** `agent_scans_by_code`, `agent_feedback_visits_by_campaign`, `agent_themes_for_sku` |
| `lib/agent.ts` | **New.** Question list, `buildAnswer(id, rows, asOf)` and `buildPriceAnswer(products, asOf)`: pure, unit-tested |
| `lib/agentData.ts` | **New.** Server-only: calls the functions, returns `AgentAnswer` |
| `app/api/agent/route.ts` | **New.** `GET ?q=<id>`; 400 for unknown IDs; `no-store`; `notFound()` in production until slice 4 |
| `components/AgentPanel.tsx` | **New.** Server Component: question links, answer, `SourceList` |
| `app/preview/agent/page.tsx` | **New.** Dev-only preview; deleted by slice 4 |
| `components/SourceList.tsx` | Only if needed: show live/synthetic counts and a date range. Existing props stay compatible |
| `scripts/check-rls.ts` | Also checks the three agent functions with harmless arguments |
| `tests/unit/agent.spec.ts` | **New** |
| `tests/e2e/agent.spec.ts` | **New** |
| `tests/browser/agent.spec.ts` | **New** |

## 3. Questions and data

| ID | Question | Data | Winner expected from slice 5 |
|---|---|---|---|
| `top-packaging-at` | Which packaging had the most scans in Austria? | `agent_scans_by_code('AT')` | `d92-at` (wrapper), at least 1.5 × the next |
| `feedback-visits-by-campaign` | Which campaign drove visits to the feedback page? | `agent_feedback_visits_by_campaign()` | `shelf-q4-2026`, at least 2 × the next |
| `top-theme-dark-92` | Which theme comes up most for the 92% bar? | `agent_themes_for_sku('dark-92')` | `bitterness`, at least 1.5 × the next |
| `comparable-dark-bars` | What do comparable dark bars cost? | `data/competitors.json`, products with `comparesTo = 'dark-92'` | Lindt Excellence Mild 90% |

## 4. Database functions

All three return:

```sql
returns table (key text, label text, total bigint, live bigint, synthetic bigint, first_ts timestamptz, last_ts timestamptz)
```

ordered by `total desc, key asc`. `first_ts` and `last_ts` are the earliest and latest row used across the whole result (same on every row).

- `agent_scans_by_code(p_market text)`: `scan_events` joined to `codes` and `campaigns`, where `market = p_market` and `is_bot = false`. `key` = code ID; `label` = code label, for example "Dark 92%, wrapper, Austria"; plus the channel in the label text.
- `agent_feedback_visits_by_campaign()`: `page_views` where `page = 'feedback'`, joined to `campaigns`. `key` = campaign ID or `none`; `label` = campaign name or "No campaign".
- `agent_themes_for_sku(p_sku text)`: `unnest(themes)` of `feedback` where `sku_id = p_sku`. `key` = theme; `label` = theme with a capital first letter.

`security invoker`, `set search_path = ''`. Execute revoked from `public`, `anon`, `authenticated`; granted to `service_role`.

## 5. Answers

```ts
interface AgentAnswer {
  id: QuestionId
  question: string
  answer: string
  sources: Source[]   // components/SourceList.tsx
  asOf: string        // ISO time
}
```

### 5.1 Sentences

| Case | Sentence |
|---|---|
| `top-packaging-at`, clear winner | "The {label} code had the most scans in Austria: {n}, against {m} for the {runner-up label}." |
| `feedback-visits-by-campaign`, clear winner | "Most feedback-page visits came from the {label} campaign: {n} of {total} visits." |
| `top-theme-dark-92`, clear winner | "{Label} comes up most in feedback on the Dark 92% bar: {n} of {total} answers." |
| `comparable-dark-bars` | "Comparable dark bars: {brand} {product}, {price} for {size} ({per kg} per kg). Prices with ~ are estimates from public listings." One clause per product |
| Only one row | Same sentence without the "against …" part |
| Tie at the top | "{A} and {B} are tied with {n} each." |
| No rows | "Not enough data yet for this question." |

Numbers use English grouping (`1,234`). No causal words ("caused", "because of", "drove" in answers). No claim words (`findClaimWords` from `lib/insights.ts`).

### 5.2 Sources

One source per data question, plus one per retailer listing for the fourth:

| Field | Example |
|---|---|
| `name` | "QR scans" / "Feedback page visits" / "Feedback answers" / publisher name |
| `detail` | "Market Austria, bots excluded · 610 rows (2 live, 608 synthetic) · 27 Sep to 26 Nov 2026" |
| `url` | Only for retailer listings |
| `date` | As-of time, Europe/Berlin, for example "26 Nov 2026, 14:05"; access date for listings |
| `kind` | `live` if only live rows, `synthetic` if only synthetic, `mixed` if both. Listings: `synthetic` is wrong for real public data, so listings use a new kind only if `SourceList` supports it; otherwise no badge (decided at build, recorded here) |

## 6. API and panel

- `GET /api/agent?q=<id>`: 200 with `AgentAnswer`; 400 `{ error: 'unknown question' }` for anything else; header `Cache-Control: no-store`; `notFound()` when `NODE_ENV === 'production'` (until slice 4's gate).
- `AgentPanel({ ask, hrefFor })`: lists the four questions as links built by `hrefFor(id)`; when `ask` is a valid ID, shows the question, the answer, and `SourceList`. Server Component, no client JavaScript.
- `/preview/agent?ask=<id>`: renders `AgentPanel` with `hrefFor = id => '/preview/agent?ask=' + id`; `notFound()` in production.

## 7. Tests (written first)

### 7.1 Unit: `tests/unit/agent.spec.ts` (no database)

| ID | Case | Expected |
|---|---|---|
| U-AG-1 | Four questions | IDs and wording as section 3 |
| U-AG-2 | Clear winner, each data question | Sentence as section 5.1, with winner and runner-up numbers |
| U-AG-3 | One row only | No "against" part |
| U-AG-4 | Tie at the top | "tied" sentence naming both |
| U-AG-5 | No rows | "Not enough data yet for this question.", sources show 0 rows |
| U-AG-6 | Only live / only synthetic / both | Badge `live` / `synthetic` / `mixed` |
| U-AG-7 | Source detail | Filter, row count with live/synthetic split, date range |
| U-AG-8 | As-of time | Formatted in Europe/Berlin |
| U-AG-9 | Every sentence | No causal words, no claim words |
| U-AG-10 | Price answer from fixture products | Brand, product, price with `~` when estimated, size, per kg, estimate note; one source per listing with URL and access date |
| U-AG-11 | Price answer with no products | "Not enough data yet for this question." |
| U-AG-12 | Number formatting | `1234` shows as `1,234` |

### 7.2 End-to-end: `tests/e2e/agent.spec.ts` (real database with synthetic data)

| ID | Case | Expected |
|---|---|---|
| E-AG-0 | Before all | Fails with "run npm run seed" if no synthetic rows exist |
| E-AG-1 | `top-packaging-at` | Names the Dark 92% wrapper code; winner ≥ 1.5 × runner-up (from the sentence numbers) |
| E-AG-2 | `feedback-visits-by-campaign` | Names the shelf talker campaign |
| E-AG-3 | `top-theme-dark-92` | Names Bitterness |
| E-AG-4 | `comparable-dark-bars` | Names Lindt Excellence Mild 90% with `~€5.09`, source link and access date |
| E-AG-5 | Every answer | At least one source with a row count above 0 and a date |
| E-AG-6 | A live scan of `d92-at` (tagged `x-e2e`) | The first answer's live count goes up by 1 and its badge becomes `mixed` |
| E-AG-7 | `q=nope`, missing `q` | 400 |
| E-AG-8 | Headers | `Cache-Control: no-store`, no `Set-Cookie` |

### 7.3 Browser: `tests/browser/agent.spec.ts`

| ID | Case | Expected |
|---|---|---|
| B-AG-1 | `/preview/agent`, JavaScript off: click each question | Answer and "Sources" with a date appear |
| B-AG-2 | Panel links | Built by `hrefFor`, so dashboard filters would be kept |
| B-AG-3 | Fits a 390 px phone | No horizontal scroll |

### 7.4 RLS

`npm run check:rls` also tries the three agent functions with the public key and expects permission denied (42501).

## 8. Out of scope

- The dashboard, its gate and its layout (slice 4, other session).
- The packaging question (dropped, see ADR 0006).
- Free-text questions.

## 9. Handover to slice 4

- Embed `<AgentPanel ask={searchParams.ask} hrefFor={...} />` in the dashboard.
- Put `/api/agent` behind the demo password gate and remove its `notFound()` production guard.
- Delete `app/preview/agent/page.tsx` and point `tests/browser/agent.spec.ts` at the dashboard.

## 10. Done when

- All tests in section 7 pass, plus all existing tests.
- `npm run typecheck`, `npm run lint`, `npm run build` pass; `npm run check:rls` passes once the publishable key is fixed.
- No test data remains in the demo database.
